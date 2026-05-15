import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { Resume } from '../../types/resume';
import type { OptimizationSession } from '../../types/ai';

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
}

const DB_NAME = 'SmartCV';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<SmartCVDB>> | null = null;

function getDB(): Promise<IDBPDatabase<SmartCVDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SmartCVDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const resumeStore = db.createObjectStore('resumes', { keyPath: 'id' });
        resumeStore.createIndex('by-updated', 'updatedAt');

        const optStore = db.createObjectStore('optimizations', { keyPath: 'id' });
        optStore.createIndex('by-resume', 'resumeId');
        optStore.createIndex('by-created', 'createdAt');
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
    const tx = db.transaction('optimizations', 'readwrite');
    await Promise.all([...opts.map(o => tx.store.delete(o.id)), tx.done]);
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
