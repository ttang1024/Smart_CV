import { useCallback, useEffect, useRef, useState } from 'react';

export type AutosaveStatus = 'saved' | 'pending' | 'saving' | 'error';

/**
 * Debounced autosave that doesn't lose edits.
 *
 * - Saves run one at a time, in order, so an older version can never overwrite a newer one.
 * - Pending changes are flushed when the tab is hidden, when the component unmounts
 *   (route change), and on beforeunload — which also asks the user to confirm leaving.
 * - A failed save keeps the change pending and reports through `onError` once per
 *   failure streak; the next edit or manual save retries it.
 */
export function useAutosave<T>(
  save: (value: T) => Promise<void>,
  { delay = 1500, onError }: { delay?: number; onError?: (error: unknown) => void } = {},
) {
  const [status, setStatus] = useState<AutosaveStatus>('saved');
  const pendingRef = useRef<T | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chainRef = useRef<Promise<boolean>>(Promise.resolve(true));
  const failingRef = useRef(false);
  const saveRef = useRef(save);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    saveRef.current = save;
    onErrorRef.current = onError;
  });

  /** Save any pending change now. Resolves to false if the save failed. */
  const flush = useCallback((): Promise<boolean> => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const value = pendingRef.current;
    if (value === null) return chainRef.current;
    pendingRef.current = null;
    setStatus('saving');

    chainRef.current = chainRef.current.then(async () => {
      try {
        await saveRef.current(value);
        failingRef.current = false;
        setStatus(pendingRef.current === null ? 'saved' : 'pending');
        return true;
      } catch (error) {
        // Keep the newest value pending so the next attempt retries it.
        pendingRef.current ??= value;
        setStatus('error');
        if (!failingRef.current) onErrorRef.current?.(error);
        failingRef.current = true;
        return false;
      }
    });
    return chainRef.current;
  }, []);

  const schedule = useCallback((value: T) => {
    pendingRef.current = value;
    setStatus('pending');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { void flush(); }, delay);
  }, [delay, flush]);

  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (pendingRef.current === null) return;
      void flush();
      event.preventDefault();
    };
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('beforeunload', onBeforeUnload);
      void flush();
    };
  }, [flush]);

  return { schedule, flush, status, hasUnsaved: status !== 'saved' };
}
