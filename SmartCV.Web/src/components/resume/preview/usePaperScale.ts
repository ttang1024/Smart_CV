import { useEffect, useRef, useState } from 'react';
import { PAGE_SIZES, type PageSizeId } from './constants';

/**
 * Fit a fixed-width paper into its container. `wrapRef` is the clipping container whose
 * width drives the scale; `paperRef` is the unscaled paper whose height sizes the clip.
 */
export function usePaperScale(pageSize: PageSizeId, enabled = true) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [paperHeight, setPaperHeight] = useState<number>(PAGE_SIZES[pageSize].heightPx);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !enabled) return;
    const widthPx = PAGE_SIZES[pageSize].widthPx;
    const update = () => setScale(Math.min(1, el.clientWidth / widthPx));
    const obs = new ResizeObserver(update);
    obs.observe(el);
    update();
    return () => obs.disconnect();
  }, [pageSize, enabled]);

  useEffect(() => {
    const el = paperRef.current;
    if (!el || !enabled) return;
    const obs = new ResizeObserver(() => setPaperHeight(el.scrollHeight));
    obs.observe(el);
    return () => obs.disconnect();
  }, [enabled]);

  return { wrapRef, paperRef, scale, paperHeight };
}
