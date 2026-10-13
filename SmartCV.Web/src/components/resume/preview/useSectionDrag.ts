import { useState } from 'react';
import type { ResumeSection } from '../../../types/resume';

/** Move `from` to the position currently held by `to`. Returns the same array if either is missing. */
export function moveSection(order: ResumeSection[], from: ResumeSection, to: ResumeSection): ResumeSection[] {
  const fromIdx = order.indexOf(from);
  const toIdx = order.indexOf(to);
  if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return order;
  const next = [...order];
  next.splice(fromIdx, 1);
  next.splice(toIdx, 0, from);
  return next;
}

/** Drag-to-reorder state for the section list beside the preview paper. */
export function useSectionDrag(sectionOrder: ResumeSection[], onReorder: (order: ResumeSection[]) => void) {
  const [dragKey, setDragKey] = useState<ResumeSection | null>(null);
  const [dragOverKey, setDragOverKey] = useState<ResumeSection | null>(null);

  const reset = () => {
    setDragKey(null);
    setDragOverKey(null);
  };

  const drop = (target: ResumeSection) => {
    if (dragKey) {
      const next = moveSection(sectionOrder, dragKey, target);
      if (next !== sectionOrder) onReorder(next);
    }
    reset();
  };

  return { dragKey, dragOverKey, onDragStart: setDragKey, onDragOver: setDragOverKey, onDrop: drop, onDragEnd: reset };
}
