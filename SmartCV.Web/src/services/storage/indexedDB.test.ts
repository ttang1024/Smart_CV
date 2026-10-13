import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it, vi } from 'vitest';
import {
  jobApplicationDB, MAX_REVISIONS_PER_RESUME, optimizationDB, resetDBConnectionForTests,
  resumeDB, revisionDB, scoreSnapshotDB, type ResumeRevision,
} from './indexedDB';
import { createEmptyResume } from '../../store/resumeStore';
import type { AtsCheckResult } from '../ats/atsTypes';
import type { OptimizationSession } from '../../types/ai';
import type { JobApplication } from '../../types/jobApplication';

function makeAtsResult(score: number): AtsCheckResult {
  return {
    score,
    verdict: 'Good',
    summary: '',
    issues: [],
    passed: [],
    stats: { wordCount: 0, bulletCount: 0, quantifiedBulletCount: 0, actionVerbBulletCount: 0, sectionCount: 0, missingCoreSections: [] },
  };
}

// Each test starts from a fresh in-memory IndexedDB (fake-indexeddb/auto replaces the global),
// but the module under test caches its connection in a module-level singleton, so we reuse the
// same database across tests and instead give every test its own resume id to stay isolated.
function uniqueId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function makeApplication(baseResumeId: string, versionResumeId: string): JobApplication {
  const now = new Date().toISOString();
  return {
    id: uniqueId('app'), baseResumeId, versionResumeId, role: 'Engineer', company: 'Acme',
    status: 'draft', exportHistory: [], createdAt: now, updatedAt: now,
  };
}

function makeRevision(resumeId: string, createdAt: string): ResumeRevision {
  return { id: uniqueId('rev'), resumeId, label: 'Edit', createdAt, resume: { ...createEmptyResume(), id: resumeId } };
}

describe('resumeDB', () => {
  it('saves and retrieves a resume by id', async () => {
    const resume = createEmptyResume('Test Resume');
    await resumeDB.save(resume);

    const loaded = await resumeDB.get(resume.id);

    expect(loaded?.name).toBe('Test Resume');
  });

  it('returns all resumes ordered most-recently-updated first', async () => {
    const older = { ...createEmptyResume('Older'), updatedAt: '2024-01-01T00:00:00.000Z' };
    const newer = { ...createEmptyResume('Newer'), updatedAt: '2024-06-01T00:00:00.000Z' };
    await resumeDB.save(older);
    await resumeDB.save(newer);

    const all = await resumeDB.getAll();
    const ids = all.map(r => r.id);

    expect(ids.indexOf(newer.id)).toBeLessThan(ids.indexOf(older.id));
  });

  it('saveMany writes every resume', async () => {
    const a = createEmptyResume('A');
    const b = createEmptyResume('B');

    await resumeDB.saveMany([a, b]);

    expect(await resumeDB.exists(a.id)).toBe(true);
    expect(await resumeDB.exists(b.id)).toBe(true);
  });

  it('createVersion stores the version resume and its job application together', async () => {
    const base = createEmptyResume('Base');
    const version = { ...createEmptyResume('Version'), baseResumeId: base.id };
    const application = makeApplication(base.id, version.id);

    await resumeDB.createVersion(version, application);

    expect(await resumeDB.get(version.id)).toBeDefined();
    expect((await jobApplicationDB.getByResume(base.id)).map(a => a.id)).toEqual([application.id]);
    expect((await jobApplicationDB.getByResume(version.id)).map(a => a.id)).toEqual([application.id]);
  });

  it('deleting a resume also deletes its revisions and job applications', async () => {
    const resume = createEmptyResume('To Delete');
    const otherVersion = createEmptyResume('Other');
    await resumeDB.save(resume);
    await revisionDB.add(makeRevision(resume.id, new Date().toISOString()));
    await jobApplicationDB.save(makeApplication(resume.id, otherVersion.id));

    await resumeDB.delete(resume.id);

    expect(await revisionDB.list(resume.id)).toEqual([]);
    expect(await jobApplicationDB.getByResume(resume.id)).toEqual([]);
  });

  it('deleting a resume also deletes its optimizations and score snapshots', async () => {
    const resume = createEmptyResume('To Delete');
    await resumeDB.save(resume);

    const session: OptimizationSession = {
      id: uniqueId('opt'), resumeId: resume.id, jobDescription: 'JD', result: {
        matchScore: 50, keywordMatches: [], missingKeywords: [], suggestions: [], summary: '',
      }, createdAt: new Date().toISOString(),
    };
    await optimizationDB.save(session);
    await scoreSnapshotDB.recordIfChanged(resume.id, makeAtsResult(70));

    await resumeDB.delete(resume.id);

    expect(await resumeDB.get(resume.id)).toBeUndefined();
    expect(await optimizationDB.getByResume(resume.id)).toEqual([]);
    expect(await scoreSnapshotDB.getByResume(resume.id)).toEqual([]);
  });
});

describe('scoreSnapshotDB', () => {
  it('returns an empty list for a resume with no recorded snapshots', async () => {
    expect(await scoreSnapshotDB.getByResume(uniqueId('resume'))).toEqual([]);
  });

  it('records a snapshot the first time a score is seen', async () => {
    const resumeId = uniqueId('resume');

    const snapshot = await scoreSnapshotDB.recordIfChanged(resumeId, makeAtsResult(42));

    expect(snapshot?.score).toBe(42);
    expect(snapshot?.resumeId).toBe(resumeId);
    const all = await scoreSnapshotDB.getByResume(resumeId);
    expect(all).toHaveLength(1);
    expect(all[0].score).toBe(42);
  });

  it('does not record a duplicate snapshot when the score is unchanged', async () => {
    const resumeId = uniqueId('resume');

    await scoreSnapshotDB.recordIfChanged(resumeId, makeAtsResult(60));
    const second = await scoreSnapshotDB.recordIfChanged(resumeId, makeAtsResult(60));

    expect(second).toBeNull();
    expect(await scoreSnapshotDB.getByResume(resumeId)).toHaveLength(1);
  });

  it('records a new snapshot when the score changes, in chronological order', async () => {
    const resumeId = uniqueId('resume');

    await scoreSnapshotDB.recordIfChanged(resumeId, makeAtsResult(40));
    await scoreSnapshotDB.recordIfChanged(resumeId, makeAtsResult(55));
    await scoreSnapshotDB.recordIfChanged(resumeId, makeAtsResult(55)); // no-op, unchanged
    await scoreSnapshotDB.recordIfChanged(resumeId, makeAtsResult(70));

    const all = await scoreSnapshotDB.getByResume(resumeId);

    expect(all.map(s => s.score)).toEqual([40, 55, 70]);
  });

  it('caps stored snapshots per resume at 200, evicting the oldest first', async () => {
    const resumeId = uniqueId('resume');

    // Snapshots are ordered/trimmed by createdAt, so ties matter: pin the clock and advance it
    // by 1ms per write to guarantee a strict, deterministic ordering instead of relying on
    // however fast this loop happens to run in real time.
    // Only fake Date — fake-indexeddb schedules its own request completion via real timers,
    // so faking those too would make every `await` on a DB call hang forever.
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      const start = Date.now();
      for (let score = 0; score <= 200; score++) {
        vi.setSystemTime(start + score);
        await scoreSnapshotDB.recordIfChanged(resumeId, makeAtsResult(score));
      }
    } finally {
      vi.useRealTimers();
    }

    const all = await scoreSnapshotDB.getByResume(resumeId);

    expect(all).toHaveLength(200);
    expect(all[0].score).toBe(1); // score 0 was evicted as the oldest entry
    expect(all[all.length - 1].score).toBe(200);
  });
});

describe('revisionDB', () => {
  it('lists revisions newest first and caps them per resume', async () => {
    const resumeId = uniqueId('resume');
    const base = Date.parse('2024-01-01T00:00:00.000Z');
    for (let i = 0; i < MAX_REVISIONS_PER_RESUME + 5; i++) {
      await revisionDB.add(makeRevision(resumeId, new Date(base + i * 1000).toISOString()));
    }

    const list = await revisionDB.list(resumeId);

    expect(list).toHaveLength(MAX_REVISIONS_PER_RESUME);
    expect(list[0].createdAt > list[list.length - 1].createdAt).toBe(true);
    expect(list[list.length - 1].createdAt).toBe(new Date(base + 5000).toISOString());
  });

  it('removes a single revision', async () => {
    const resumeId = uniqueId('resume');
    const revision = makeRevision(resumeId, new Date().toISOString());
    await revisionDB.add(revision);

    await revisionDB.remove(revision.id);

    expect(await revisionDB.list(resumeId)).toEqual([]);
  });
});

describe('jobApplicationDB', () => {
  it('updates status and keeps the 20 most recent exports', async () => {
    const application = await jobApplicationDB.save(makeApplication(uniqueId('base'), uniqueId('version')));

    await jobApplicationDB.updateStatus(application.id, 'applied');
    for (let i = 0; i < 25; i++) {
      await jobApplicationDB.addExport(application.id, {
        id: `export-${i}`, exportedAt: new Date().toISOString(), filename: `${i}.pdf`, format: 'pdf',
      });
    }

    const stored = await jobApplicationDB.get(application.id);
    expect(stored?.status).toBe('applied');
    expect(stored?.exportHistory).toHaveLength(20);
    expect(stored?.exportHistory[0].id).toBe('export-24');
  });
});

describe('legacy localStorage migration', () => {
  it('moves job applications and undo history into IndexedDB, then clears localStorage', async () => {
    // Start from an empty database so the migration runs on open.
    await resetDBConnectionForTests();
    globalThis.indexedDB = new IDBFactory();

    const resumeId = uniqueId('resume');
    const application = makeApplication(resumeId, uniqueId('version'));
    const revision = makeRevision(resumeId, new Date().toISOString());
    localStorage.setItem('smartcv:job-applications', JSON.stringify([application]));
    localStorage.setItem(`smartcv:resume-history:${resumeId}`, JSON.stringify([revision]));

    expect((await jobApplicationDB.getByResume(resumeId)).map(a => a.id)).toEqual([application.id]);
    expect((await revisionDB.list(resumeId)).map(r => r.id)).toEqual([revision.id]);
    expect(localStorage.getItem('smartcv:job-applications')).toBeNull();
    expect(localStorage.getItem(`smartcv:resume-history:${resumeId}`)).toBeNull();
  });

  it('ignores corrupt legacy data instead of failing to open', async () => {
    await resetDBConnectionForTests();
    globalThis.indexedDB = new IDBFactory();
    localStorage.setItem('smartcv:job-applications', '{not json');

    expect(await jobApplicationDB.getByResume(uniqueId('resume'))).toEqual([]);
    expect(localStorage.getItem('smartcv:job-applications')).toBeNull();
  });
});
