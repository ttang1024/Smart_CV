import { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type LangCode } from '../../i18n';

interface LanguageSwitcherProps {
  variant?: 'light' | 'dark';
}

export default function LanguageSwitcher({ variant = 'light' }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = SUPPORTED_LANGUAGES.find(l => l.code === i18n.language)
    ?? SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isDark = variant === 'dark';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-all ${
          isDark
            ? 'text-white/80 border-white/20 hover:border-white/40 hover:text-white'
            : 'text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-900 bg-white'
        }`}
        aria-label="Switch language"
      >
        <Globe className="w-3.5 h-3.5" />
        <span className="font-medium">{current.label}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50">
          {SUPPORTED_LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => { i18n.changeLanguage(lang.code as LangCode); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                lang.code === i18n.language
                  ? 'text-indigo-600 font-semibold bg-indigo-50'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
