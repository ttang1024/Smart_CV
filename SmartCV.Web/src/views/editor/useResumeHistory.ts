import { useCallback, useEffect, useRef, useState } from 'react';
import type { Resume } from '../../types/resume';
import { MAX_REVISIONS_PER_RESUME, revisionDB, type ResumeRevision } from '../../services/storage/indexedDB';
import { monotonicIsoNow } from '../../lib/utils';

/** Edits closer together than this are merged into one undo step (e.g. typing a word). */
export const HISTORY_COALESCE_MS = 1200;

const EMPTY: ResumeRevision[] = [];

function snapshot(resume: Resume, label: string): ResumeRevision {
  return {
    id: crypto.randomUUID(),
    resumeId: resume.id,
    label,
    createdAt: monotonicIsoNow(),
    resume: structuredClone(resume),
  };
}

interface Stacks {
  resumeId: string | null;
  undo: ResumeRevision[];
  redo: ResumeRevision[];
}

/**
 * Undo/redo for one resume. The undo stack is persisted (IndexedDB) so it survives a
 * reload; the redo stack is in-memory only.
 *
 * Callers record the state being *replaced* before applying a change, outside of any
 * React state updater, so history writes happen exactly once per change.
 */
export function useResumeHistory(resumeId: string | null, now: () => number = Date.now) {
  const [stacks, setStacks] = useState<Stacks>({ resumeId: null, undo: EMPTY, redo: EMPTY });
  // The ref mirrors state so callbacks stay stable and never read stale stacks.
  const stacksRef = useRef<Stacks>(stacks);
  const lastRecordRef = useRef(0);

  const commit = useCallback((next: Stacks) => {
    stacksRef.current = next;
    setStacks(next);
  }, []);

  /** Stacks for `id`, starting fresh when the resume changed. */
  const stacksFor = useCallback((id: string): Stacks => {
    if (stacksRef.current.resumeId === id) return stacksRef.current;
    lastRecordRef.current = 0;
    return { resumeId: id, undo: EMPTY, redo: EMPTY };
  }, []);

  useEffect(() => {
    if (!resumeId) return;
    let active = true;
    revisionDB.list(resumeId).then(persisted => {
      if (!active) return;
      const current = stacksFor(resumeId);
      // Keep anything recorded while the list was loading.
      const known = new Set(current.undo.map(r => r.id));
      const undo = [...current.undo, ...persisted.filter(r => !known.has(r.id))].slice(0, MAX_REVISIONS_PER_RESUME);
      commit({ ...current, undo });
    }).catch(() => { /* history is best-effort */ });
    return () => { active = false; };
  }, [resumeId, commit, stacksFor]);

  /** Record `previous` as an undo point unless it coalesces with the last one. */
  const record = useCallback((previous: Resume, label = 'Edit', force = false) => {
    const current = stacksFor(previous.id);
    const t = now();
    const coalesce =
      !force &&
      current.redo.length === 0 &&
      current.undo.length > 0 &&
      t - lastRecordRef.current <= HISTORY_COALESCE_MS;
    if (coalesce) return;
    lastRecordRef.current = t;

    const revision = snapshot(previous, label);
    commit({ ...current, undo: [revision, ...current.undo].slice(0, MAX_REVISIONS_PER_RESUME), redo: EMPTY });
    void revisionDB.add(revision).catch(() => { /* history is best-effort */ });
  }, [commit, now, stacksFor]);

  /** Pop the newest undo point; `current` becomes a redo point. Returns the revision to restore. */
  const undo = useCallback((currentResume: Resume): ResumeRevision | null => {
    const current = stacksFor(currentResume.id);
    const [revision, ...rest] = current.undo;
    if (!revision) return null;
    commit({
      ...current,
      undo: rest,
      redo: [snapshot(currentResume, 'Redo point'), ...current.redo].slice(0, MAX_REVISIONS_PER_RESUME),
    });
    lastRecordRef.current = now();
    void revisionDB.remove(revision.id).catch(() => {});
    return revision;
  }, [commit, now, stacksFor]);

  /** Pop the newest redo point; `current` becomes an undo point. Returns the revision to restore. */
  const redo = useCallback((currentResume: Resume): ResumeRevision | null => {
    const current = stacksFor(currentResume.id);
    const [revision, ...rest] = current.redo;
    if (!revision) return null;
    const undoPoint = snapshot(currentResume, 'Undo point');
    commit({ ...current, undo: [undoPoint, ...current.undo].slice(0, MAX_REVISIONS_PER_RESUME), redo: rest });
    lastRecordRef.current = now();
    void revisionDB.add(undoPoint).catch(() => {});
    return revision;
  }, [commit, now, stacksFor]);

  const active = stacks.resumeId === resumeId;
  return {
    undoStack: active ? stacks.undo : EMPTY,
    redoStack: active ? stacks.redo : EMPTY,
    record,
    undo,
    redo,
  };
}
