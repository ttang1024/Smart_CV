import { useEffect, useRef } from 'react';

/** True when the event target is a text field or rich-text editor with its own undo. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]') !== null;
}

/**
 * Cmd/Ctrl+S saves everywhere. Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z and Cmd/Ctrl+Y undo/redo the
 * whole resume — except while typing in a field, where the browser's own text undo wins.
 */
export function useEditorShortcuts(handlers: { save: () => void; undo: () => void; redo: () => void }) {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      const key = e.key.toLowerCase();

      if (key === 's') {
        e.preventDefault();
        handlersRef.current.save();
        return;
      }

      const isUndo = key === 'z' && !e.shiftKey;
      const isRedo = key === 'y' || (key === 'z' && e.shiftKey);
      if (!isUndo && !isRedo) return;
      if (isEditableTarget(e.target)) return;

      e.preventDefault();
      if (isUndo) handlersRef.current.undo();
      else handlersRef.current.redo();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
