import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useEditorShortcuts } from './useEditorShortcuts';

function press(target: EventTarget, key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key, ctrlKey: true, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

function setup() {
  const handlers = { save: vi.fn(), undo: vi.fn(), redo: vi.fn() };
  renderHook(() => useEditorShortcuts(handlers));
  return handlers;
}

describe('useEditorShortcuts', () => {
  it('undoes and redoes the resume outside text fields', () => {
    const handlers = setup();

    expect(press(document.body, 'z').defaultPrevented).toBe(true);
    press(document.body, 'z', { shiftKey: true });
    press(document.body, 'y');

    expect(handlers.undo).toHaveBeenCalledTimes(1);
    expect(handlers.redo).toHaveBeenCalledTimes(2);
  });

  it('leaves Ctrl+Z to the browser inside inputs and rich-text editors', () => {
    const handlers = setup();
    const input = document.body.appendChild(document.createElement('input'));
    const editor = document.body.appendChild(document.createElement('div'));
    editor.setAttribute('contenteditable', 'true');
    const nested = editor.appendChild(document.createElement('b'));

    const event = press(input, 'z');
    press(nested, 'z');

    expect(event.defaultPrevented).toBe(false);
    expect(handlers.undo).not.toHaveBeenCalled();
    input.remove();
    editor.remove();
  });

  it('saves with Ctrl+S even while typing', () => {
    const handlers = setup();
    const input = document.body.appendChild(document.createElement('textarea'));

    expect(press(input, 's').defaultPrevented).toBe(true);
    expect(handlers.save).toHaveBeenCalledTimes(1);
    input.remove();
  });
});
