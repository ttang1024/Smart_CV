import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutosave } from './useAutosave';

describe('useAutosave', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('debounces: only the latest value is saved once the delay passes', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutosave<string>(save, { delay: 1000 }));

    act(() => { result.current.schedule('a'); result.current.schedule('ab'); });
    expect(result.current.status).toBe('pending');
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('ab');
    expect(result.current.status).toBe('saved');
  });

  it('flushes pending changes when the editor unmounts', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result, unmount } = renderHook(() => useAutosave<string>(save, { delay: 1000 }));

    act(() => result.current.schedule('unsaved'));
    unmount();
    await vi.runAllTimersAsync();

    expect(save).toHaveBeenCalledWith('unsaved');
  });

  it('flushes when the tab is hidden', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutosave<string>(save, { delay: 60_000 }));

    act(() => result.current.schedule('draft'));
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });

    expect(save).toHaveBeenCalledWith('draft');
  });

  it('reports a failure once, keeps the change pending and retries it on the next flush', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('quota')).mockRejectedValueOnce(new Error('quota')).mockResolvedValue(undefined);
    const onError = vi.fn();
    const { result } = renderHook(() => useAutosave<string>(save, { delay: 10, onError }));

    act(() => result.current.schedule('v1'));
    let ok = true;
    await act(async () => { ok = await result.current.flush(); });
    expect(ok).toBe(false);
    expect(result.current.status).toBe('error');

    await act(async () => { await result.current.flush(); });
    expect(onError).toHaveBeenCalledTimes(1);

    await act(async () => { ok = await result.current.flush(); });
    expect(ok).toBe(true);
    expect(save).toHaveBeenLastCalledWith('v1');
    expect(result.current.status).toBe('saved');
  });

  it('never runs two saves at once, so an older value cannot land after a newer one', async () => {
    const order: string[] = [];
    let release!: () => void;
    const save = vi.fn((value: string) => {
      order.push(`start ${value}`);
      return value === 'old'
        ? new Promise<void>(resolve => { release = () => { order.push('end old'); resolve(); }; })
        : Promise.resolve().then(() => { order.push(`end ${value}`); });
    });
    const { result } = renderHook(() => useAutosave<string>(save));

    act(() => result.current.schedule('old'));
    let first!: Promise<boolean>;
    act(() => { first = result.current.flush(); });
    act(() => result.current.schedule('new'));
    let second!: Promise<boolean>;
    act(() => { second = result.current.flush(); });
    // Saves run on a promise chain; let the first one start.
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(order).toEqual(['start old']);
    release();
    await act(async () => { await Promise.all([first, second]); });

    expect(order).toEqual(['start old', 'end old', 'start new', 'end new']);
  });
});
