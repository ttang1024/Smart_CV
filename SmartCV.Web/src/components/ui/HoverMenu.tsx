import { useRef, useState, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface HoverMenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  title?: string;
}

interface HoverMenuProps {
  /** Content rendered inside the trigger button. */
  trigger: ReactNode;
  items: HoverMenuItem[];
  /** Horizontal alignment of the dropdown relative to the trigger. */
  align?: 'left' | 'right';
  triggerClassName?: string;
}

/**
 * A button that reveals a dropdown of actions on hover (and on click/focus for
 * keyboard & touch). The dropdown stays open while the pointer is anywhere over
 * the trigger or the menu.
 */
export default function HoverMenu({ trigger, items, align = 'right', triggerClassName }: HoverMenuProps) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => { cancelClose(); setOpen(true); }}
      onMouseLeave={scheduleClose}
      onFocus={() => { cancelClose(); setOpen(true); }}
      onBlur={scheduleClose}
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 h-8 px-3 text-sm font-medium rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-500',
          'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700',
          triggerClassName
        )}
      >
        {trigger}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute top-full z-50 pt-1 min-w-[12rem]',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-1">
            {items.map(item => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled || item.loading}
                title={item.title}
                onClick={() => { setOpen(false); item.onClick(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                {item.loading ? (
                  <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  item.icon && <span className="shrink-0 inline-flex">{item.icon}</span>
                )}
                <span className="flex-1">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
