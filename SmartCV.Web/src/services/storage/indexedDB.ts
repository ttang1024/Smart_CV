import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { Resume } from '../../types/resume';
import type { OptimizationSession } from '../../types/ai';
import type { ScoreSnapshot } from '../../types/scoreSnapshot';
import type { ExportHistoryItem, JobApplication, JobApplicationStatus } from '../../types/jobApplication';
import type { AtsCheckResult } from '../ats/atsTypes';
import { monotonicIsoNow } from '../../lib/utils';

/**
 * All persistent user data lives in one IndexedDB database, so related records can be
 * written and deleted in a single transaction. (Settings and UI preferences stay in
 * localStorage; see localStorage.ts.)
 */

export interface ResumeRevision {
  id: string;
  resumeId: string;
  label: string;
  createdAt: string;
  resume: Resume;
}

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
    indexes: { 'by-resume': string; 'by-created': string; 'by-resume-created': [string, string] };
  };
  revisions: {
    key: string;
    value: ResumeRevision;
    indexes: { 'by-resume-created': [string, string] };
  };
  jobApplications: {
    key: string;
    value: JobApplication;
    indexes: { 'by-base': string; 'by-version': string };
  };
}

type StoreName = 'resumes' | 'optimizations' | 'scoreSnapshots' | 'revisions' | 'jobApplications';

const DB_NAME = 'SmartCV';
const DB_VERSION = 3;
export const MAX_SNAPSHOTS_PER_RESUME = 200;
export const MAX_REVISIONS_PER_RESUME = 30;
const MAX_EXPORTS_PER_APPLICATION = 20;

// Pre-v3 builds kept these in localStorage; they are moved into IndexedDB on first open.
const LEGACY_JOB_APPLICATIONS_KEY = 'smartcv:job-applications';
const LEGACY_REVISIONS_PREFIX = 'smartcv:resume-history:';

let dbPromise: Promise<IDBPDatabase<SmartCVDB>> | null = null;

function getDB(): Promise<IDBPDatabase<SmartCVDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SmartCVDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, tx) {
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

        if (oldVersion < 3) {
          tx.objectStore('scoreSnapshots').createIndex('by-resume-created', ['resumeId', 'createdAt']);

          const revisions = db.createObjectStore('revisions', { keyPath: 'id' });
          revisions.createIndex('by-resume-created', ['resumeId', 'createdAt']);

          const applications = db.createObjectStore('jobApplications', { keyPath: 'id' });
          applications.createIndex('by-base', 'baseResumeId');
          applications.createIndex('by-version', 'versionResumeId');
        }
      },
    }).then(async db => {
      await migrateLegacyLocalStorage(db);
      return db;
    });
  }
  return dbPromise;
}

/** Test hook: close and forget the cached connection. */
export async function resetDBConnectionForTests(): Promise<void> {
  if (dbPromise) (await dbPromise).close();
  dbPromise = null;
}

function readLegacyJson<T>(key: string): T[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function migrateLegacyLocalStorage(db: IDBPDatabase<SmartCVDB>): Promise<void> {
  if (typeof localStorage === 'undefined') return;

  const revisionKeys = Object.keys(localStorage).filter(key => key.startsWith(LEGACY_REVISIONS_PREFIX));
  const hasApplications = localStorage.getItem(LEGACY_JOB_APPLICATIONS_KEY) !== null;
  if (!hasApplications && revisionKeys.length === 0) return;

  const tx = db.transaction(['jobApplications', 'revisions'], 'readwrite');
  for (const application of readLegacyJson<JobApplication>(LEGACY_JOB_APPLICATIONS_KEY)) {
    if (application?.id) void tx.objectStore('jobApplications').put(application);
  }
  for (const key of revisionKeys) {
    for (const revision of readLegacyJson<ResumeRevision>(key).slice(0, MAX_REVISIONS_PER_RESUME)) {
      if (revision?.id && revision.resumeId) void tx.objectStore('revisions').put(revision);
    }
  }
  await tx.done;

  // Only drop the legacy copies once the IndexedDB writes have committed.
  localStorage.removeItem(LEGACY_JOB_APPLICATIONS_KEY);
  revisionKeys.forEach(key => localStorage.removeItem(key));
}

const byResume = (resumeId: string) => IDBKeyRange.bound([resumeId, ''], [resumeId, '￿']);

// ── Resumes ──────────────────────────────────────────────────────────────────

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

  async exists(id: string): Promise<boolean> {
    const db = await getDB();
    return (await db.getKey('resumes', id)) !== undefined;
  },

  async save(resume: Resume): Promise<void> {
    const db = await getDB();
    await db.put('resumes', resume);
  },

  /** Save several resumes atomically: either all are written or none are. */
  async saveMany(resumes: Resume[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('resumes', 'readwrite');
    await Promise.all([...resumes.map(resume => tx.store.put(resume)), tx.done]);
  },

  /**
   * Delete a resume and everything that belongs to it — optimization sessions, score
   * history, undo history and job applications it is the base or version of — in one
   * transaction, so a failure can't leave orphaned records behind.
   */
  async delete(id: string): Promise<void> {
    const db = await getDB();
    const stores: StoreName[] = ['resumes', 'optimizations', 'scoreSnapshots', 'revisions', 'jobApplications'];
    const tx = db.transaction(stores, 'readwrite');
    const pending: Promise<unknown>[] = [tx.objectStore('resumes').delete(id)];

    const deleteKeys = async (keys: Promise<IDBValidKey[]>, store: StoreName) => {
      for (const key of await keys) await tx.objectStore(store).delete(key as string);
    };
    pending.push(
      deleteKeys(tx.objectStore('optimizations').index('by-resume').getAllKeys(id), 'optimizations'),
      deleteKeys(tx.objectStore('scoreSnapshots').index('by-resume').getAllKeys(id), 'scoreSnapshots'),
      deleteKeys(tx.objectStore('revisions').index('by-resume-created').getAllKeys(byResume(id)), 'revisions'),
      deleteKeys(tx.objectStore('jobApplications').index('by-base').getAllKeys(id), 'jobApplications'),
      deleteKeys(tx.objectStore('jobApplications').index('by-version').getAllKeys(id), 'jobApplications'),
    );

    await Promise.all([...pending, tx.done]);
  },

  async duplicate(id: string): Promise<Resume | null> {
    const original = await resumeDB.get(id);
    if (!original) return null;
    const now = new Date().toISOString();
    const copy: Resume = {
      ...original,
      id: crypto.randomUUID(),
      name: `${original.name} (Copy)`,
      baseResumeId: undefined,
      jobApplicationId: undefined,
      versionLabel: undefined,
      createdAt: now,
      updatedAt: now,
    };
    await resumeDB.save(copy);
    return copy;
  },

  /** Create a job-specific resume version and its application record together. */
  async createVersion(version: Resume, application: JobApplication): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(['resumes', 'jobApplications'], 'readwrite');
    await Promise.all([
      tx.objectStore('resumes').put(version),
      tx.objectStore('jobApplications').put(application),
      tx.done,
    ]);
  },
};

// ── Optimization sessions ────────────────────────────────────────────────────

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
  },
};

// ── ATS score snapshots ──────────────────────────────────────────────────────
// A lightweight time series of ATS scores per resume, recorded on save so the
// Insights panel can chart progress.

export const scoreSnapshotDB = {
  async getByResume(resumeId: string): Promise<ScoreSnapshot[]> {
    const db = await getDB();
    return db.getAllFromIndex('scoreSnapshots', 'by-resume-created', byResume(resumeId));
  },

  // Only writes a new point when the score actually moved, so idle autosaves don't
  // flood the store. Reads just the newest snapshot rather than the whole series.
  async recordIfChanged(resumeId: string, result: AtsCheckResult): Promise<ScoreSnapshot | null> {
    const db = await getDB();
    const tx = db.transaction('scoreSnapshots', 'readwrite');
    const index = tx.store.index('by-resume-created');

    const latest = await index.openCursor(byResume(resumeId), 'prev');
    if (latest && latest.value.score === result.score) {
      await tx.done;
      return null;
    }

    const snapshot: ScoreSnapshot = {
      id: crypto.randomUUID(),
      resumeId,
      score: result.score,
      verdict: result.verdict,
      wordCount: result.stats.wordCount,
      bulletCount: result.stats.bulletCount,
      quantifiedBulletCount: result.stats.quantifiedBulletCount,
      sectionCount: result.stats.sectionCount,
      createdAt: monotonicIsoNow(),
    };
    await tx.store.put(snapshot);

    let overflow = (await index.count(byResume(resumeId))) - MAX_SNAPSHOTS_PER_RESUME;
    let oldest = overflow > 0 ? await index.openCursor(byResume(resumeId), 'next') : null;
    while (oldest && overflow > 0) {
      await oldest.delete();
      overflow--;
      oldest = await oldest.continue();
    }

    await tx.done;
    return snapshot;
  },
};

// ── Undo history ─────────────────────────────────────────────────────────────

export const revisionDB = {
  /** Newest first. */
  async list(resumeId: string): Promise<ResumeRevision[]> {
    const db = await getDB();
    const revisions = await db.getAllFromIndex('revisions', 'by-resume-created', byResume(resumeId));
    return revisions.reverse().slice(0, MAX_REVISIONS_PER_RESUME);
  },

  /** Store a revision and prune the oldest beyond the per-resume cap. */
  async add(revision: ResumeRevision): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('revisions', 'readwrite');
    const index = tx.store.index('by-resume-created');
    await tx.store.put(revision);

    let overflow = (await index.count(byResume(revision.resumeId))) - MAX_REVISIONS_PER_RESUME;
    let oldest = overflow > 0 ? await index.openCursor(byResume(revision.resumeId), 'next') : null;
    while (oldest && overflow > 0) {
      await oldest.delete();
      overflow--;
      oldest = await oldest.continue();
    }
    await tx.done;
  },

  async remove(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('revisions', id);
  },
};

// ── Job applications ─────────────────────────────────────────────────────────

export const jobApplicationDB = {
  async get(id: string): Promise<JobApplication | undefined> {
    const db = await getDB();
    return db.get('jobApplications', id);
  },

  /** Applications where the resume is either the base or the tailored version. Newest first. */
  async getByResume(resumeId: string): Promise<JobApplication[]> {
    const db = await getDB();
    const [asBase, asVersion] = await Promise.all([
      db.getAllFromIndex('jobApplications', 'by-base', resumeId),
      db.getAllFromIndex('jobApplications', 'by-version', resumeId),
    ]);
    const unique = new Map([...asBase, ...asVersion].map(application => [application.id, application]));
    return [...unique.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async save(application: JobApplication): Promise<JobApplication> {
    const db = await getDB();
    const next = { ...application, updatedAt: new Date().toISOString() };
    await db.put('jobApplications', next);
    return next;
  },

  async updateStatus(id: string, status: JobApplicationStatus): Promise<JobApplication | undefined> {
    const application = await jobApplicationDB.get(id);
    return application ? jobApplicationDB.save({ ...application, status }) : undefined;
  },

  async addExport(id: string, exportItem: ExportHistoryItem): Promise<JobApplication | undefined> {
    const application = await jobApplicationDB.get(id);
    if (!application) return undefined;
    return jobApplicationDB.save({
      ...application,
      exportHistory: [exportItem, ...application.exportHistory].slice(0, MAX_EXPORTS_PER_APPLICATION),
    });
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('jobApplications', id);
  },
};
