import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { optimizationDB, resumeDB, scoreSnapshotDB } from './indexedDB';
import { createEmptyResume } from '../../store/resumeStore';
import type { AtsCheckResult } from '../ats/atsTypes';
import type { OptimizationSession } from '../../types/ai';

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

  it('deletes all snapshots for a resume', async () => {
    const resumeId = uniqueId('resume');
    await scoreSnapshotDB.recordIfChanged(resumeId, makeAtsResult(10));
    await scoreSnapshotDB.recordIfChanged(resumeId, makeAtsResult(20));

    await scoreSnapshotDB.deleteByResume(resumeId);

    expect(await scoreSnapshotDB.getByResume(resumeId)).toEqual([]);
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
