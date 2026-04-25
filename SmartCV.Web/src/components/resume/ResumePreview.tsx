import { useRef, useState, useEffect } from 'react';

const PAPER_W_PX = 210 * (96 / 25.4); // A4 width in CSS px at 96 dpi ≈ 793.7
import { DownloadOutlined } from '@ant-design/icons';
import { GripVertical } from 'lucide-react';
import type { Resume, ResumeSection } from '../../types/resume';
import { DEFAULT_SECTION_ORDER } from '../../types/resume';
import Button from '../ui/Button';
import {
  deriveTheme, STYLES,
  type StyleId, type CustomOptions, type CustomHeader, type CustomExp,
  type CustomSectionStyle, type CustomLayoutMode, type CustomSkillsStyle,
  type CustomEduStyle, type CustomSummaryStyle, type ThemeColors, type LayoutProps,
} from './resumeTypes';
import { ClassicLayout } from './layouts/ClassicLayout';
import { ModernLayout } from './layouts/ModernLayout';
import { ExecutiveLayout } from './layouts/ExecutiveLayout';
import { MinimalLayout } from './layouts/MinimalLayout';
import { CreativeLayout } from './layouts/CreativeLayout';
import { ElegantLayout } from './layouts/ElegantLayout';
import { AcademicLayout } from './layouts/AcademicLayout';
import { SplitLayout } from './layouts/SplitLayout';
import { TimelineLayout } from './layouts/TimelineLayout';
import { CustomLayout } from './layouts/CustomLayout';

const SECTION_LABELS: Record<ResumeSection, string> = {
  personalInfo: 'Personal Info',
  summary: 'Summary',
  coreHighlights: 'Highlights',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  certifications: 'Certs',
  languages: 'Languages',
  achievements: 'Achievements',
  interests: 'Interests',
  referees: 'Referees',
};

interface ResumePreviewProps {
  resume: Resume;
  onChange?: (resume: Resume) => void;
}

export default function ResumePreview({ resume: r, onChange }: ResumePreviewProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const scaleWrapRef = useRef<HTMLDivElement>(null);
  const [styleId, setStyleId] = useState<StyleId>('classic');
  const [mainColor, setMainColor] = useState('#4338ca');
  const [downloading, setDownloading] = useState(false);
  const [dragKey, setDragKey] = useState<ResumeSection | null>(null);
  const [dragOverKey, setDragOverKey] = useState<ResumeSection | null>(null);
  const [scale, setScale] = useState(1);
  const [paperHeight, setPaperHeight] = useState(297 * (96 / 25.4)); // A4 height px

  // Recompute scale whenever the clip wrapper resizes
  useEffect(() => {
    const el = scaleWrapRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / PAPER_W_PX)));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Track the paper's actual rendered height for the clip wrapper
  useEffect(() => {
    const el = printRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setPaperHeight(el.scrollHeight));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const [customOptions, setCustomOptions] = useState<CustomOptions>({
    header: 'split',
    experience: 'timeline',
    skillsColumns: 1,
    sectionStyle: 'bar',
    layoutMode: 'single',
    skillsStyle: 'list',
    education: 'standard',
    summary: 'paragraph',
  });
  const theme = deriveTheme(mainColor);
  const sectionOrder = r.sectionOrder ?? DEFAULT_SECTION_ORDER;

  const handleSectionDrop = (targetKey: ResumeSection) => {
    if (!dragKey || dragKey === targetKey || !onChange) return;
    const order = [...sectionOrder];
    const fromIdx = order.indexOf(dragKey);
    const toIdx = order.indexOf(targetKey);
    if (fromIdx === -1 || toIdx === -1) return;
    order.splice(fromIdx, 1);
    order.splice(toIdx, 0, dragKey);
    onChange({ ...r, sectionOrder: order });
    setDragKey(null);
    setDragOverKey(null);
  };

  const handleDownloadPDF = async () => {
    const element = printRef.current;
    if (!element) return;

    setDownloading(true);
    try {
      const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{background:#fff;}
h2{break-after:avoid;page-break-after:avoid;}
</style>
</head>
<body>${element.outerHTML}</body>
</html>`;

      const filename = `${r.personalInfo.fullName || 'resume'}.pdf`;

      const res = await fetch('/api/pdf/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, filename }),
      });

      if (!res.ok) throw new Error('PDF generation failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        {/* Style picker + Download */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {STYLES.map(s => (
              <button
                key={s.id}
                onClick={() => setStyleId(s.id)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${styleId === s.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500'
                  }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <Button size="sm" variant="secondary" onClick={handleDownloadPDF} loading={downloading} className="shrink-0">
            {!downloading && <DownloadOutlined style={{ fontSize: '16px' }} />}
            {downloading ? 'Generating…' : 'Download PDF'}
          </Button>
        </div>

        {/* Theme colour picker */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">Theme colour:</span>
          <input
            type="color"
            value={mainColor}
            onChange={e => setMainColor(e.target.value)}
            className="w-7 h-7 rounded cursor-pointer border border-gray-300 dark:border-gray-600 bg-transparent p-0.5"
            title="Pick theme colour"
          />
          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{mainColor}</span>
        </div>

        {/* Custom layout options */}
        {styleId === 'custom' && (
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1 border-t border-gray-200 dark:border-gray-700">
            {(
              [
                { label: 'Layout', options: [['single', 'Single'], ['two-column', '2 Col']], value: customOptions.layoutMode, set: (v: string) => setCustomOptions(o => ({ ...o, layoutMode: v as CustomLayoutMode })) },
                { label: 'Header', options: [['classic', 'Classic'], ['split', 'Split']], value: customOptions.header, set: (v: string) => setCustomOptions(o => ({ ...o, header: v as CustomHeader })) },
                { label: 'Section', options: [['bar', 'Bar'], ['underline', 'Underline'], ['plain', 'Plain']], value: customOptions.sectionStyle, set: (v: string) => setCustomOptions(o => ({ ...o, sectionStyle: v as CustomSectionStyle })) },
                { label: 'Experience', options: [['list', 'List'], ['timeline', 'Timeline']], value: customOptions.experience, set: (v: string) => setCustomOptions(o => ({ ...o, experience: v as CustomExp })) },
                { label: 'Skills', options: [['list', 'List'], ['tags', 'Tags']], value: customOptions.skillsStyle, set: (v: string) => setCustomOptions(o => ({ ...o, skillsStyle: v as CustomSkillsStyle })) },
                { label: 'Cols', options: [['1', '1'], ['2', '2']], value: String(customOptions.skillsColumns), set: (v: string) => setCustomOptions(o => ({ ...o, skillsColumns: Number(v) as 1 | 2 })) },
                { label: 'Education', options: [['standard', 'Standard'], ['compact', 'Compact']], value: customOptions.education, set: (v: string) => setCustomOptions(o => ({ ...o, education: v as CustomEduStyle })) },
                { label: 'Summary', options: [['paragraph', 'Para'], ['callout', 'Callout']], value: customOptions.summary, set: (v: string) => setCustomOptions(o => ({ ...o, summary: v as CustomSummaryStyle })) },
              ] as { label: string; options: [string, string][]; value: string; set: (v: string) => void }[]
            ).map(group => (
              <div key={group.label} className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{group.label}:</span>
                {group.options.map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => group.set(id)}
                    className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${group.value === id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500'
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resume Paper */}
      <div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-950">
        <div className="flex items-start gap-3 px-4 py-4 min-h-full">
          {/*
            scaleWrapRef clips overflow and drives the scale calculation.
            The transform is on an inner div so printRef stays transform-free
            (its outerHTML goes to the PDF renderer at 100% size).
          */}
          <div
            ref={scaleWrapRef}
            className="flex-1 min-w-0 overflow-hidden shadow-lg flex justify-center"
            style={{ height: `${paperHeight * scale}px` }}
          >
            <div style={{ width: '210mm', flexShrink: 0, transformOrigin: 'top center', transform: `scale(${scale})` }}>
              <div ref={printRef} className="bg-white" style={{ width: '210mm', minHeight: '297mm' }}>
                {styleId === 'classic' && <ClassicLayout r={r} theme={theme} />}
                {styleId === 'modern' && <ModernLayout r={r} theme={theme} />}
                {styleId === 'executive' && <ExecutiveLayout r={r} theme={theme} />}
                {styleId === 'minimal' && <MinimalLayout r={r} theme={theme} />}
                {styleId === 'creative' && <CreativeLayout r={r} theme={theme} />}
                {styleId === 'elegant' && <ElegantLayout r={r} theme={theme} />}
                {styleId === 'academic' && <AcademicLayout r={r} theme={theme} />}
                {styleId === 'split' && <SplitLayout r={r} theme={theme} />}
                {styleId === 'timeline' && <TimelineLayout r={r} theme={theme} />}
                {styleId === 'custom' && <CustomLayout r={r} theme={theme} options={customOptions} />}
              </div>
            </div>
          </div>
          {onChange && (
            <div className="sticky top-4 self-start shrink-0">
              <MiniModuleList
                sectionOrder={sectionOrder}
                dragKey={dragKey}
                dragOverKey={dragOverKey}
                onDragStart={setDragKey}
                onDragOver={setDragOverKey}
                onDrop={handleSectionDrop}
                onDragEnd={() => { setDragKey(null); setDragOverKey(null); }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Mini module list for drag-reorder in preview ────────────────────────────

function MiniModuleList({ sectionOrder, dragKey, dragOverKey, onDragStart, onDragOver, onDrop, onDragEnd }: {
  sectionOrder: ResumeSection[];
  dragKey: ResumeSection | null;
  dragOverKey: ResumeSection | null;
  onDragStart: (key: ResumeSection) => void;
  onDragOver: (key: ResumeSection) => void;
  onDrop: (key: ResumeSection) => void;
  onDragEnd: () => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm w-[120px] p-2">
      <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 px-0.5">Sections</div>
      {sectionOrder.map(key => (
        <div
          key={key}
          className={`flex items-center gap-1 py-0.5 px-0.5 rounded transition-colors ${dragOverKey === key && dragKey !== key ? 'bg-indigo-50 dark:bg-indigo-950/40' : ''
            } ${dragKey === key ? 'opacity-40' : ''}`}
          onDragOver={e => { e.preventDefault(); onDragOver(key); }}
          onDrop={() => onDrop(key)}
        >
          <span
            draggable
            onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart(key); }}
            onDragEnd={onDragEnd}
            className="cursor-grab text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-500 shrink-0"
          >
            <GripVertical className="w-3 h-3" />
          </span>
          <span className="text-[11px] text-gray-600 dark:text-gray-300 truncate leading-5">{SECTION_LABELS[key]}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Named export for embedding templates in other pages ─────────────────────

const DEFAULT_CUSTOM: CustomOptions = {
  header: 'split', experience: 'list', skillsColumns: 2,
  sectionStyle: 'bar', layoutMode: 'single', skillsStyle: 'tags',
  education: 'standard', summary: 'paragraph',
};

function CustomPreview(props: LayoutProps) {
  return <CustomLayout {...props} options={DEFAULT_CUSTOM} />;
}

const LAYOUT_MAP: Record<string, React.ComponentType<LayoutProps>> = {
  classic: ClassicLayout,
  modern: ModernLayout,
  executive: ExecutiveLayout,
  minimal: MinimalLayout,
  creative: CreativeLayout,
  elegant: ElegantLayout,
  academic: AcademicLayout,
  split: SplitLayout,
  timeline: TimelineLayout,
  custom: CustomPreview,
};

export { deriveTheme };
export type { ThemeColors };

export function TemplatePreview({ resume, styleId, theme }: { resume: Resume; styleId: string; theme: ThemeColors }) {
  const Layout = LAYOUT_MAP[styleId] ?? ClassicLayout;
  return <Layout r={resume} theme={theme} />;
}
