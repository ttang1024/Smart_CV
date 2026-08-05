import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { Resume } from '../../types/resume';
import type { OptimizationSession } from '../../types/ai';
import type { ScoreSnapshot } from '../../types/scoreSnapshot';
import type { AtsCheckResult } from '../ats/atsTypes';

interface SmartCVDB extends DBSchema {
  resumes: {
    key: string;
    value: Resume;
    indexes: { 'by-updated': string };
  };
  optimizations: {
    key: string;
    value: OptimizationSession;
    indexes: { 'by-resume': string; 'by-created': string };
  };
  scoreSnapshots: {
    key: string;
    value: ScoreSnapshot;
    indexes: { 'by-resume': string; 'by-created': string };
  };
}

const DB_NAME = 'SmartCV';
const DB_VERSION = 2;
const MAX_SNAPSHOTS_PER_RESUME = 200;

let dbPromise: Promise<IDBPDatabase<SmartCVDB>> | null = null;

function getDB(): Promise<IDBPDatabase<SmartCVDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SmartCVDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const resumeStore = db.createObjectStore('resumes', { keyPath: 'id' });
          resumeStore.createIndex('by-updated', 'updatedAt');

          const optStore = db.createObjectStore('optimizations', { keyPath: 'id' });
          optStore.createIndex('by-resume', 'resumeId');
          optStore.createIndex('by-created', 'createdAt');
        }

        if (oldVersion < 2) {
          const scoreStore = db.createObjectStore('scoreSnapshots', { keyPath: 'id' });
          scoreStore.createIndex('by-resume', 'resumeId');
          scoreStore.createIndex('by-created', 'createdAt');
        }
      }
    });
  }
  return dbPromise;
}

// Resume operations
export const resumeDB = {
  async getAll(): Promise<Resume[]> {
    const db = await getDB();
    const resumes = await db.getAllFromIndex('resumes', 'by-updated');
    return resumes.reverse();
  },

  async get(id: string): Promise<Resume | undefined> {
    const db = await getDB();
    return db.get('resumes', id);
  },

  async save(resume: Resume): Promise<void> {
    const db = await getDB();
    await db.put('resumes', resume);
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('resumes', id);
    // Also delete related optimizations
    const opts = await db.getAllFromIndex('optimizations', 'by-resume', id);
    const optTx = db.transaction('optimizations', 'readwrite');
    await Promise.all([...opts.map(o => optTx.store.delete(o.id)), optTx.done]);

    // Also delete related score snapshots
    await scoreSnapshotDB.deleteByResume(id);
  },

  async duplicate(id: string): Promise<Resume | null> {
    const original = await resumeDB.get(id);
    if (!original) return null;
    const copy: Resume = {
      ...original,
      id: crypto.randomUUID(),
      name: `${original.name} (Copy)`,
      baseResumeId: undefined,
      jobApplicationId: undefined,
      versionLabel: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await resumeDB.save(copy);
    return copy;
  }
};

// Optimization session operations
export const optimizationDB = {
  async getByResume(resumeId: string): Promise<OptimizationSession[]> {
    const db = await getDB();
    const sessions = await db.getAllFromIndex('optimizations', 'by-resume', resumeId);
    return sessions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async get(id: string): Promise<OptimizationSession | undefined> {
    const db = await getDB();
    return db.get('optimizations', id);
  },

  async save(session: OptimizationSession): Promise<void> {
    const db = await getDB();
    await db.put('optimizations', session);
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('optimizations', id);
  }
};

// Score snapshot operations — a lightweight time series of ATS scores per
// resume, recorded on save so the Insights panel can chart progress.
export const scoreSnapshotDB = {
  async getByResume(resumeId: string): Promise<ScoreSnapshot[]> {
    const db = await getDB();
    const snapshots = await db.getAllFromIndex('scoreSnapshots', 'by-resume', resumeId);
    return snapshots.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  // Only writes a new point when the score actually moved, so idle autosaves
  // don't flood the store with identical entries.
  async recordIfChanged(resumeId: string, result: AtsCheckResult): Promise<ScoreSnapshot | null> {
    const db = await getDB();
    const existing = await db.getAllFromIndex('scoreSnapshots', 'by-resume', resumeId);
    const last = existing.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).at(-1);
    if (last && last.score === result.score) return null;

    const snapshot: ScoreSnapshot = {
      id: crypto.randomUUID(),
      resumeId,
      score: result.score,
      verdict: result.verdict,
      wordCount: result.stats.wordCount,
      bulletCount: result.stats.bulletCount,
      quantifiedBulletCount: result.stats.quantifiedBulletCount,
      sectionCount: result.stats.sectionCount,
      createdAt: new Date().toISOString(),
    };
    await db.put('scoreSnapshots', snapshot);

    const all = [...existing, snapshot];
    if (all.length > MAX_SNAPSHOTS_PER_RESUME) {
      const overflow = all
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .slice(0, all.length - MAX_SNAPSHOTS_PER_RESUME);
      const tx = db.transaction('scoreSnapshots', 'readwrite');
      await Promise.all([...overflow.map(s => tx.store.delete(s.id)), tx.done]);
    }

    return snapshot;
  },

  async deleteByResume(resumeId: string): Promise<void> {
    const db = await getDB();
    const snapshots = await db.getAllFromIndex('scoreSnapshots', 'by-resume', resumeId);
    const tx = db.transaction('scoreSnapshots', 'readwrite');
    await Promise.all([...snapshots.map(s => tx.store.delete(s.id)), tx.done]);
  },
};
