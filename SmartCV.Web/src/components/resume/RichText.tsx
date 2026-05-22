import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Bold, Italic, Underline, Eraser, Baseline, Rows3 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { isRichTextEmpty, sanitizeRichText } from '../../lib/richText';

const FONT_SIZE_OPTIONS = [
  { label: '8', value: '8pt' },
  { label: '9', value: '9pt' },
  { label: '10', value: '10pt' },
  { label: '11', value: '11pt' },
  { label: '12', value: '12pt' },
  { label: '14', value: '14pt' },
  { label: '16', value: '16pt' },
];

const LINE_HEIGHT_OPTIONS = [
  { label: '1.0', value: '1' },
  { label: '1.2', value: '1.2' },
  { label: '1.4', value: '1.4' },
  { label: '1.6', value: '1.6' },
  { label: '1.8', value: '1.8' },
];

export function RichTextContent({ html, style }: { html: string; style?: React.CSSProperties }) {
  if (isRichTextEmpty(html)) return null;

  return (
    <div
      className="rich-text-content"
      style={{ whiteSpace: 'pre-wrap', ...style }}
      dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }}
    />
  );
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  minHeight?: number;
  className?: string;
}

export default function RichTextEditor({ value, onChange, label, placeholder, minHeight = 96, className }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const [focused, setFocused] = useState(false);
  const [color, setColor] = useState('#111827');
  const [fontSize, setFontSize] = useState('11pt');
  const [lineHeight, setLineHeight] = useState('1.4');

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || focused) return;
    const sanitized = sanitizeRichText(value);
    if (editor.innerHTML !== sanitized) editor.innerHTML = sanitized;
  }, [value, focused]);

  const emitChange = () => {
    const editor = editorRef.current;
    if (!editor) return;
    onChange(sanitizeRichText(editor.innerHTML));
  };

  const saveSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  };

  const restoreSelection = (): boolean => {
    const editor = editorRef.current;
    const range = savedRangeRef.current;
    const selection = window.getSelection();
    if (!editor || !range || !selection) return false;

    const start = range.startContainer;
    const end = range.endContainer;
    if (!start.isConnected || !end.isConnected || !editor.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = null;
      return false;
    }

    try {
      selection.removeAllRanges();
      selection.addRange(range);
      return true;
    } catch {
      savedRangeRef.current = null;
      return false;
    }
  };

  const runCommand = (command: string, commandValue?: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    restoreSelection();
    document.execCommand(command, false, commandValue);
    saveSelection();
    emitChange();
  };

  const applyFieldStyle = (property: 'fontSize' | 'lineHeight', value: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const preserveStyle: Partial<CSSStyleDeclaration> = {};
    if (property === 'fontSize') {
      preserveStyle.fontSize = value;
      preserveStyle.lineHeight = lineHeight;
    } else {
      preserveStyle.fontSize = fontSize;
      preserveStyle.lineHeight = value;
    }

    editor.querySelectorAll<HTMLElement>('*').forEach(element => {
      element.style[property] = '';
      if (!element.getAttribute('style')) element.removeAttribute('style');
    });

    const wrapper = document.createElement('div');
    Object.assign(wrapper.style, preserveStyle);

    while (editor.firstChild) {
      wrapper.appendChild(editor.firstChild);
    }

    editor.appendChild(wrapper);
    const range = document.createRange();
    range.selectNodeContents(wrapper);
    range.collapse(false);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    savedRangeRef.current = range.cloneRange();

    emitChange();
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const html = event.clipboardData.getData('text/html');
    const text = event.clipboardData.getData('text/plain');
    document.execCommand('insertHTML', false, html ? sanitizeRichText(html) : text.replace(/\n/g, '<br>'));
    emitChange();
  };

  return (
    <div className={className}>
      {label && <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">{label}</label>}
      <div className="rounded-md border border-input bg-background shadow-sm focus-within:ring-1 focus-within:ring-ring">
        <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700 px-2 py-1 bg-gray-50 dark:bg-gray-800/50">
          <ToolbarButton title="Bold" onClick={() => runCommand('bold')}><Bold className="w-3.5 h-3.5" /></ToolbarButton>
          <ToolbarButton title="Italic" onClick={() => runCommand('italic')}><Italic className="w-3.5 h-3.5" /></ToolbarButton>
          <ToolbarButton title="Underline" onClick={() => runCommand('underline')}><Underline className="w-3.5 h-3.5" /></ToolbarButton>
          <ToolbarSelect
            title="Font size"
            icon={<Baseline className="w-3.5 h-3.5" />}
            value={fontSize}
            options={FONT_SIZE_OPTIONS}
            onMouseDown={saveSelection}
            onChange={next => {
              setFontSize(next);
              applyFieldStyle('fontSize', next);
            }}
          />
          <ToolbarSelect
            title="Line spacing"
            icon={<Rows3 className="w-3.5 h-3.5" />}
            value={lineHeight}
            options={LINE_HEIGHT_OPTIONS}
            onMouseDown={saveSelection}
            onChange={next => {
              setLineHeight(next);
              applyFieldStyle('lineHeight', next);
            }}
          />
          <label
            className="relative h-7 w-7 inline-flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            title="Text color"
            onMouseDown={saveSelection}
          >
            <input
              type="color"
              value={color}
              onChange={e => {
                setColor(e.target.value);
                runCommand('foreColor', e.target.value);
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <span className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600 pointer-events-none" style={{ backgroundColor: color }} />
          </label>
          <ToolbarButton title="Clear formatting" onClick={() => runCommand('removeFormat')}><Eraser className="w-3.5 h-3.5" /></ToolbarButton>
        </div>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); saveSelection(); emitChange(); }}
          onInput={() => { saveSelection(); emitChange(); }}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          onPaste={handlePaste}
          className={cn(
            'rich-text-editor rich-text-content px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none overflow-y-auto',
            'empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none'
          )}
          style={{ minHeight }}
        />
      </div>
    </div>
  );
}

function ToolbarSelect({ title, icon, value, options, onMouseDown, onChange }: {
  title: string;
  icon: ReactNode;
  value: string;
  options: readonly { label: string; value: string }[];
  onMouseDown: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <label className="h-7 inline-flex items-center gap-1 rounded px-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" title={title}>
      {icon}
      <select
        value={value}
        onMouseDown={onMouseDown}
        onChange={e => onChange(e.target.value)}
        className="h-6 max-w-14 bg-transparent text-xs outline-none"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function ToolbarButton({ title, onClick, children }: { title: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      className="h-7 w-7 inline-flex items-center justify-center rounded text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
    >
      {children}
    </button>
  );
}
