'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Eye, Palette } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Resume } from '../../types/resume';
import {
  DEFAULT_PAGE_MARGINS_MM,
  deriveTheme,
  type LayoutProps,
  type StyleId,
} from '../resume/resumeTypes';
import { ClassicLayout } from '../resume/layouts/ClassicLayout';
import { ModernLayout } from '../resume/layouts/ModernLayout';
import { ExecutiveLayout } from '../resume/layouts/ExecutiveLayout';
import { MinimalLayout } from '../resume/layouts/MinimalLayout';
import { ElegantLayout } from '../resume/layouts/ElegantLayout';
import { AcademicLayout } from '../resume/layouts/AcademicLayout';
import { SplitLayout } from '../resume/layouts/SplitLayout';
import { TimelineLayout } from '../resume/layouts/TimelineLayout';
import { CustomLayout } from '../resume/layouts/CustomLayout';

const PAPER_WIDTH_PX = 210 * (96 / 25.4);
const HERO_PREVIEW_SCALE = 0.5;
const CAROUSEL_INTERVAL_MS = 2800;
const INTERACTION_PAUSE_MS = 9000;

const RESUME_STYLES: { id: StyleId; name: string; accent: string }[] = [
  { id: 'classic', name: 'Classic', accent: '#059669' },
  { id: 'modern', name: 'Modern', accent: '#0d9488' },
  { id: 'executive', name: 'Executive', accent: '#1e40af' },
  { id: 'minimal', name: 'Minimal', accent: '#6b7280' },
  { id: 'elegant', name: 'Elegant', accent: '#b5914a' },
  { id: 'academic', name: 'Academic', accent: '#7c3aed' },
  { id: 'split', name: 'Split', accent: '#0891b2' },
  { id: 'timeline', name: 'Timeline', accent: '#059669' },
  { id: 'custom', name: '* Custom', accent: '#e11d48' },
];

const CUSTOM_OPTIONS = {
  header: 'split',
  experience: 'timeline',
  skillsColumns: 2,
  sectionStyle: 'bar',
  skillsStyle: 'tags',
  education: 'compact',
  summary: 'paragraph',
} as const;

const LAYOUTS: Record<StyleId, (props: LayoutProps) => ReactNode> = {
  classic: props => <ClassicLayout {...props} />,
  modern: props => <ModernLayout {...props} />,
  executive: props => <ExecutiveLayout {...props} backgroundColor={props.theme.dark} fullNameColor="#ffffff" />,
  minimal: props => <MinimalLayout {...props} />,
  elegant: props => <ElegantLayout {...props} />,
  academic: props => <AcademicLayout {...props} />,
  split: props => <SplitLayout {...props} />,
  timeline: props => <TimelineLayout {...props} />,
  custom: props => <CustomLayout {...props} options={CUSTOM_OPTIONS} />,
};

export default function ResumeHeroPreview({
  resume,
  language,
}: {
  resume: Resume;
  language: string;
}) {
  const { i18n } = useTranslation();
  const frameRef = useRef<HTMLDivElement>(null);
  const carouselPausedRef = useRef(false);
  const carouselPauseTimeoutRef = useRef<number | null>(null);
  const [activeStyle, setActiveStyle] = useState<StyleId>('classic');
  const [accentColor, setAccentColor] = useState(RESUME_STYLES[0].accent);
  const [scale, setScale] = useState(HERO_PREVIEW_SCALE);
  const theme = useMemo(() => deriveTheme(accentColor), [accentColor]);
  const Layout = LAYOUTS[activeStyle];

  useEffect(() => {
    void i18n.changeLanguage(language);
  }, [i18n, language]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const updateScale = () => {
      const available = Math.max(240, frame.clientWidth - 24);
      setScale(Math.min(HERO_PREVIEW_SCALE, available / PAPER_WIDTH_PX));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (carouselPausedRef.current) return;

      setActiveStyle(currentStyle => {
        const currentIndex = RESUME_STYLES.findIndex(style => style.id === currentStyle);
        const nextStyle = RESUME_STYLES[(currentIndex + 1) % RESUME_STYLES.length];
        return nextStyle.id;
      });
    }, CAROUSEL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      if (carouselPauseTimeoutRef.current !== null) {
        window.clearTimeout(carouselPauseTimeoutRef.current);
      }
    };
  }, []);

  const pauseCarousel = () => {
    carouselPausedRef.current = true;
    if (carouselPauseTimeoutRef.current !== null) {
      window.clearTimeout(carouselPauseTimeoutRef.current);
    }
    carouselPauseTimeoutRef.current = window.setTimeout(() => {
      carouselPausedRef.current = false;
      carouselPauseTimeoutRef.current = null;
    }, INTERACTION_PAUSE_MS);
  };

  const selectStyle = (style: { id: StyleId; accent: string }) => {
    pauseCarousel();
    setActiveStyle(style.id);
  };

  const updateAccentColor = (color: string) => {
    pauseCarousel();
    setAccentColor(color);
  };

  return (
    <div className="w-full">
      <div className="relative rounded-2xl overflow-hidden border border-gray-200/80 shadow-[0_32px_80px_-12px_rgba(5,150,105,0.18)] bg-white">
        <div className="grid bg-white" style={{ gridTemplateColumns: '92px minmax(0,1fr)' }}>
          <div className="flex flex-col gap-3 p-2.5 border-r border-gray-100 bg-gray-50/60 overflow-y-auto">
            <div>
              <span className="flex items-center gap-1 text-[7px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                <Eye className="w-2.5 h-2.5" />
                Style
              </span>
              <div className="flex flex-col gap-0.5">
                {RESUME_STYLES.map(style => (
                  <button
                    type="button"
                    key={style.id}
                    onClick={() => selectStyle(style)}
                    className="text-[8px] font-semibold px-1.5 py-0.5 rounded text-left transition-all truncate"
                    style={style.id === activeStyle ? { background: accentColor, color: '#fff' } : { color: '#6b7280' }}
                  >
                    {style.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="flex items-center gap-1 text-[7px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                <Palette className="w-2.5 h-2.5" />
                Color
              </span>
              <label className="flex items-center gap-1">
                <input
                  type="color"
                  value={accentColor}
                  onChange={event => updateAccentColor(event.target.value)}
                  className="w-7 h-7 rounded border border-gray-200 bg-transparent p-0.5 cursor-pointer"
                  aria-label="Pick preview color"
                />
                <span className="min-w-0 truncate text-[8px] font-mono text-gray-400">{accentColor}</span>
              </label>
            </div>
          </div>

          <div ref={frameRef} className="relative overflow-hidden bg-gray-50/40" style={{ aspectRatio: '210/297' }}>
            <div
              className="absolute left-1/2 top-0 bg-white shadow-sm transition-opacity duration-500"
              style={{
                width: '210mm',
                minHeight: '297mm',
                transform: `translateX(-50%) scale(${scale})`,
                transformOrigin: 'top center',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            >
              <Layout r={resume} theme={theme} pageMarginsMm={DEFAULT_PAGE_MARGINS_MM} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
