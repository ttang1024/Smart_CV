'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type LangCode } from '../../i18n';

interface LanguageSwitcherProps {
  variant?: 'light' | 'dark';
}

export default function LanguageSwitcher({ variant = 'light' }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const languageLinks: Record<LangCode, string> = {
    en: '/',
    es: '/es',
    'zh-CN': '/zh-cn',
    'zh-TW': '/zh-tw',
  };

  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;
  const current = SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage)
    ?? SUPPORTED_LANGUAGES[0];
  const isLandingRoute = ['/', '/es', '/zh-cn', '/zh-tw'].includes(pathname ?? '/');

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
          {SUPPORTED_LANGUAGES.map(lang => {
            const className = `block w-full text-left px-3 py-2 text-sm transition-colors ${
              lang.code === currentLanguage
                ? 'text-emerald-600 font-semibold bg-emerald-50'
                : 'text-gray-700 hover:bg-gray-50'
            }`;
            const changeLanguage = () => {
              void i18n.changeLanguage(lang.code as LangCode);
              setOpen(false);
            };

            return isLandingRoute ? (
              <Link
                key={lang.code}
                href={languageLinks[lang.code]}
                onClick={changeLanguage}
                className={className}
              >
                {lang.label}
              </Link>
            ) : (
              <button
                key={lang.code}
                type="button"
                onClick={changeLanguage}
                className={className}
              >
                {lang.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
