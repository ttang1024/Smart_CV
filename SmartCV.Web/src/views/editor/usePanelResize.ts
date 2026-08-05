import { useCallback, useEffect, useRef, useState } from 'react';

type ResizeTarget = 'left' | 'ai';

/**
 * Manages the two draggable dividers of the editor layout: the left editor
 * column (percentage width) and the right tools panel (pixel width). Returns
 * the live widths, which divider is being dragged, the container ref used to
 * measure available width, and a `startDrag` factory for the dividers.
 */
export function usePanelResize() {
  const [leftWidthPct, setLeftWidthPct] = useState(40);
  const [aiWidthPx, setAiWidthPx] = useState(384);
  const [draggingPanel, setDraggingPanel] = useState<ResizeTarget | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<ResizeTarget | null>(null);
  const dragStartX = useRef(0);
  const dragStartValue = useRef(0);

  const startDrag = useCallback((panel: ResizeTarget) => (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = panel;
    setDraggingPanel(panel);
    dragStartX.current = e.clientX;
    dragStartValue.current = panel === 'left' ? leftWidthPct : aiWidthPx;
  }, [leftWidthPct, aiWidthPx]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const containerWidth = containerRef.current.getBoundingClientRect().width;
      const delta = e.clientX - dragStartX.current;
      if (dragging.current === 'left') {
        const deltaPct = (delta / containerWidth) * 100;
        setLeftWidthPct(Math.max(20, Math.min(60, dragStartValue.current + deltaPct)));
      } else {
        setAiWidthPx(Math.max(280, Math.min(640, dragStartValue.current - delta)));
      }
    };
    const onMouseUp = () => {
      dragging.current = null;
      setDraggingPanel(null);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return { leftWidthPct, aiWidthPx, draggingPanel, containerRef, startDrag };
}
