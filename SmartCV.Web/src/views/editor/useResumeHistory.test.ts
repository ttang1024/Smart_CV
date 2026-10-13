import 'fake-indexeddb/auto';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HISTORY_COALESCE_MS, useResumeHistory } from './useResumeHistory';
import { revisionDB } from '../../services/storage/indexedDB';
import { createEmptyResume } from '../../store/resumeStore';

function setup() {
  const base = createEmptyResume('History');
  let clock = 1_000_000;
  const now = () => clock;
  const advance = (ms: number) => { clock += ms; };
  const hook = renderHook(({ id }) => useResumeHistory(id, now), { initialProps: { id: base.id } });
  const version = (summary: string) => ({ ...base, summary });
  return { base, hook, advance, version };
}

describe('useResumeHistory', () => {
  it('coalesces rapid edits into a single undo step', () => {
    const { hook, advance, version } = setup();

    act(() => hook.result.current.record(version('a')));
    advance(200);
    act(() => hook.result.current.record(version('ab')));
    advance(HISTORY_COALESCE_MS + 1);
    act(() => hook.result.current.record(version('abc')));

    expect(hook.result.current.undoStack.map(r => r.resume.summary)).toEqual(['abc', 'a']);
  });

  it('always records forced entries such as AI suggestions', () => {
    const { hook, version } = setup();

    act(() => hook.result.current.record(version('a')));
    act(() => hook.result.current.record(version('b'), 'AI suggestion', true));

    expect(hook.result.current.undoStack[0].label).toBe('AI suggestion');
  });

  it('undo returns the previous state and makes the current one redoable', () => {
    const { hook, version } = setup();
    act(() => hook.result.current.record(version('before')));

    let restored: string | undefined;
    act(() => { restored = hook.result.current.undo(version('after'))?.resume.summary; });
    expect(restored).toBe('before');
    expect(hook.result.current.redoStack[0].resume.summary).toBe('after');

    let redone: string | undefined;
    act(() => { redone = hook.result.current.redo(version('before'))?.resume.summary; });
    expect(redone).toBe('after');
    expect(hook.result.current.redoStack).toEqual([]);
  });

  it('a new edit after undo clears the redo stack', () => {
    const { hook, version } = setup();
    act(() => hook.result.current.record(version('one')));
    act(() => { hook.result.current.undo(version('two')); });

    act(() => hook.result.current.record(version('three')));

    expect(hook.result.current.redoStack).toEqual([]);
  });

  it('persists undo points so they survive a reload', async () => {
    const { base, hook, version } = setup();
    act(() => hook.result.current.record(version('persisted')));

    await waitFor(async () => expect((await revisionDB.list(base.id)).map(r => r.resume.summary)).toContain('persisted'));

    const reloaded = renderHook(() => useResumeHistory(base.id));
    await waitFor(() => expect(reloaded.result.current.undoStack.map(r => r.resume.summary)).toContain('persisted'));
  });

  it('starts empty when switching to another resume', () => {
    const { hook, version } = setup();
    act(() => hook.result.current.record(version('a')));

    hook.rerender({ id: 'another-resume' });

    expect(hook.result.current.undoStack).toEqual([]);
  });
});
