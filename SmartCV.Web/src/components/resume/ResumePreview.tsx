import { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const PAPER_W_PX = 210 * (96 / 25.4); // A4 width in CSS px at 96 dpi ≈ 793.7
const MIN_PAGE_MARGIN_MM = 6;
const MAX_PAGE_MARGIN_MM = 24;
import { DownloadOutlined } from '@ant-design/icons';
import { GripVertical } from 'lucide-react';
import type { Resume, ResumeSection } from '../../types/resume';
import { DEFAULT_SECTION_ORDER } from '../../types/resume';
import Button from '../ui/Button';
import { sectionTitle } from './resumeShared';
import {
  deriveTheme, STYLES,
  type StyleId, type CustomOptions, type CustomHeader, type CustomExp,
  type CustomSectionStyle, type CustomLayoutMode, type CustomSkillsStyle,
  type CustomEduStyle, type CustomSummaryStyle, type ThemeColors, type LayoutProps,
  type PageMarginsMm, DEFAULT_PAGE_MARGINS_MM,
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

interface ResumePreviewProps {
  resume: Resume;
  onChange?: (resume: Resume) => void;
  onExport?: (filename: string) => void;
}

export default function ResumePreview({ resume: r, onChange, onExport }: ResumePreviewProps) {
  const { t } = useTranslation();
  const printRef = useRef<HTMLDivElement>(null);
  const scaleWrapRef = useRef<HTMLDivElement>(null);
  const [styleId, setStyleId] = useState<StyleId>('classic');
  const [mainColor, setMainColor] = useState('#047857');
  const [backgroundColor, setBackgroundColor] = useState<string | null>(null);
  const [fullNameColor, setFullNameColor] = useState('#ffffff');
  const [downloading, setDownloading] = useState(false);
  const [dragKey, setDragKey] = useState<ResumeSection | null>(null);
  const [dragOverKey, setDragOverKey] = useState<ResumeSection | null>(null);
  const [scale, setScale] = useState(1);
  const [paperHeight, setPaperHeight] = useState(297 * (96 / 25.4)); // A4 height px
  const [pageMarginsMm, setPageMarginsMm] = useState<PageMarginsMm>(DEFAULT_PAGE_MARGINS_MM);

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
  const layoutBackgroundColor = backgroundColor ?? theme.dark;
  const sectionOrder = r.sectionOrder ?? DEFAULT_SECTION_ORDER;
  const usesDownloadedSidebar =
    styleId === 'creative' || (styleId === 'custom' && customOptions.layoutMode === 'two-column');
  const supportsBackgroundColor =
    styleId === 'executive' || styleId === 'creative' || (styleId === 'custom' && customOptions.layoutMode === 'two-column');
  const updatePageMargin = (side: keyof PageMarginsMm, value: string) => {
    const next = Number(value);
    if (Number.isNaN(next)) return;
    setPageMarginsMm(margins => ({
      ...margins,
      [side]: Math.min(MAX_PAGE_MARGIN_MM, Math.max(MIN_PAGE_MARGIN_MM, next)),
    }));
  };

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
      // Clone and strip minHeight from the wrapper and the layout root so that a
      // 297mm minimum doesn't overflow the margined content area and create
      // a spurious blank trailing page.
      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.minHeight = '';
      const layoutRoot = clone.firstElementChild as HTMLElement | null;
      if (layoutRoot) layoutRoot.style.minHeight = '';
      if (usesDownloadedSidebar) {
        clone.style.position = 'relative';
        clone.style.minHeight = '297mm';
        const sidebarBackfill = document.createElement('div');
        sidebarBackfill.setAttribute('aria-hidden', 'true');
        sidebarBackfill.style.position = 'absolute';
        sidebarBackfill.style.top = '0';
        sidebarBackfill.style.left = '0';
        sidebarBackfill.style.width = '68mm';
        sidebarBackfill.style.height = 297 + pageMarginsMm.bottom + 4 + 'mm';
        sidebarBackfill.style.background = layoutBackgroundColor;
        sidebarBackfill.style.zIndex = '0';
        clone.insertBefore(sidebarBackfill, clone.firstChild);
        Array.from(clone.children).forEach(child => {
          if (child === sidebarBackfill || !(child instanceof HTMLElement)) return;
          child.style.position = child.style.position || 'relative';
          child.style.zIndex = child.style.zIndex || '1';
        });
      }

      const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{background:#fff;font-family:'Noto Sans CJK SC','Noto Sans CJK TC','Noto Sans SC','Noto Sans TC','PingFang SC','Microsoft YaHei','SimHei',sans-serif;}
h2{break-after:avoid;page-break-after:avoid;}
.rich-text-content ul,.rich-text-content ol{margin:0;padding-left:1.35em;}
.rich-text-content [data-list-style="disc"]{list-style-type:disc;}
.rich-text-content [data-list-style="circle"]{list-style-type:circle;}
.rich-text-content [data-list-style="square"]{list-style-type:square;}
.rich-text-content [data-list-style="decimal"]{list-style-type:decimal;}
.rich-text-content [data-list-style="lower-alpha"]{list-style-type:lower-alpha;}
.rich-text-content [data-list-style="upper-alpha"]{list-style-type:upper-alpha;}
.rich-text-content [data-list-style="lower-roman"]{list-style-type:lower-roman;}
.rich-text-content [data-list-style="upper-roman"]{list-style-type:upper-roman;}
.rich-text-content [data-list-style="none"]{list-style-type:none;}
.rich-text-content [data-list-style="dash"],.rich-text-content [data-list-style="check"]{list-style-type:none;padding-left:0;}
.rich-text-content [data-list-style="dash"]>li,.rich-text-content [data-list-style="check"]>li{position:relative;padding-left:1.15em;}
.rich-text-content [data-list-style="dash"]>li::before,.rich-text-content [data-list-style="check"]>li::before{position:absolute;left:0;}
.rich-text-content [data-list-style="dash"]>li::before{content:"-";}
.rich-text-content [data-list-style="check"]>li::before{content:"✓";}
/* Breathing room at every page boundary; flush at top of first page
   so full-bleed coloured headers reach the paper edge.
   Sidebar layouts manage their own left edge, so left=0. */
@page{size:A4;margin:${pageMarginsMm.top}mm ${pageMarginsMm.right}mm ${usesDownloadedSidebar ? '0' : pageMarginsMm.bottom + 'mm'} ${usesDownloadedSidebar ? '0' : pageMarginsMm.left + 'mm'};}
@page :first{margin:${usesDownloadedSidebar
          ? '0'
          : `0 ${pageMarginsMm.right}mm ${pageMarginsMm.bottom}mm ${pageMarginsMm.left}mm`
        };}
</style>
</head>
<body>${clone.outerHTML}</body>
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
      onExport?.(filename);
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
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500'
                  }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <Button size="sm" variant="secondary" onClick={handleDownloadPDF} loading={downloading} className="shrink-0">
            {!downloading && <DownloadOutlined style={{ fontSize: '16px' }} />}
            {downloading ? t('resumeLayout.preview.generating') : t('resumeLayout.preview.downloadPdf')}
          </Button>
        </div>

        {/* Theme colour picker */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{t('resumeLayout.preview.themeColour')}</span>
          <input
            type="color"
            value={mainColor}
            onChange={e => setMainColor(e.target.value)}
            className="w-7 h-7 rounded cursor-pointer border border-gray-300 dark:border-gray-600 bg-transparent p-0.5"
            title="Pick theme colour"
          />
          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{mainColor}</span>
          {supportsBackgroundColor && (
            <>
              <span className="ml-3 text-xs text-gray-500 dark:text-gray-400 shrink-0">{t('resumeLayout.preview.backgroundColour')}</span>
              <input
                type="color"
                value={layoutBackgroundColor}
                onChange={e => setBackgroundColor(e.target.value)}
                className="w-7 h-7 rounded cursor-pointer border border-gray-300 dark:border-gray-600 bg-transparent p-0.5"
                title="Pick background colour"
              />
              <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{layoutBackgroundColor}</span>
              <span className="ml-3 text-xs text-gray-500 dark:text-gray-400 shrink-0">{t('resumeLayout.preview.fullNameColour')}</span>
              <input
                type="color"
                value={fullNameColor}
                onChange={e => setFullNameColor(e.target.value)}
                className="w-7 h-7 rounded cursor-pointer border border-gray-300 dark:border-gray-600 bg-transparent p-0.5"
                title="Pick full name text colour"
              />
              <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{fullNameColor}</span>
            </>
          )}
        </div>

        {/* Page margins */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{t('resumeLayout.preview.pageMargins')}</span>
          {(
            [
              ['top', t('resumeLayout.preview.marginTop')],
              ['bottom', t('resumeLayout.preview.marginBottom')],
              ['left', t('resumeLayout.preview.marginLeft')],
              ['right', t('resumeLayout.preview.marginRight')],
            ] as [keyof PageMarginsMm, string][]
          ).map(([side, label]) => (
            <label key={side} className="flex items-center gap-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
              <input
                type="number"
                min={MIN_PAGE_MARGIN_MM}
                max={MAX_PAGE_MARGIN_MM}
                value={pageMarginsMm[side]}
                onChange={e => updatePageMargin(side, e.target.value)}
                className="w-12 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-1.5 py-0.5 text-xs text-gray-700 dark:text-gray-200"
              />
            </label>
          ))}
          <span className="text-xs text-gray-400 dark:text-gray-500">{t('resumeLayout.preview.mm')}</span>
        </div>

        {/* Custom layout options */}
        {styleId === 'custom' && (
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1 border-t border-gray-200 dark:border-gray-700">
            {(
              [
                { label: t('resumeLayout.preview.layout'), options: [['single', t('resumeLayout.preview.single')], ['two-column', t('resumeLayout.preview.twoCol')]], value: customOptions.layoutMode, set: (v: string) => setCustomOptions(o => ({ ...o, layoutMode: v as CustomLayoutMode })) },
                { label: t('resumeLayout.preview.header'), options: [['classic', t('resumeLayout.preview.classic')], ['split', t('resumeLayout.preview.split')]], value: customOptions.header, set: (v: string) => setCustomOptions(o => ({ ...o, header: v as CustomHeader })) },
                { label: t('resumeLayout.preview.section'), options: [['bar', t('resumeLayout.preview.bar')], ['underline', t('resumeLayout.preview.underline')], ['plain', t('resumeLayout.preview.plain')]], value: customOptions.sectionStyle, set: (v: string) => setCustomOptions(o => ({ ...o, sectionStyle: v as CustomSectionStyle })) },
                { label: t('resumeLayout.preview.experience'), options: [['list', t('resumeLayout.preview.list')], ['timeline', t('resumeLayout.preview.timeline')]], value: customOptions.experience, set: (v: string) => setCustomOptions(o => ({ ...o, experience: v as CustomExp })) },
                { label: t('resumeLayout.preview.skills'), options: [['list', t('resumeLayout.preview.list')], ['tags', t('resumeLayout.preview.tags')]], value: customOptions.skillsStyle, set: (v: string) => setCustomOptions(o => ({ ...o, skillsStyle: v as CustomSkillsStyle })) },
                { label: t('resumeLayout.preview.cols'), options: [['1', '1'], ['2', '2']], value: String(customOptions.skillsColumns), set: (v: string) => setCustomOptions(o => ({ ...o, skillsColumns: Number(v) as 1 | 2 })) },
                { label: t('resumeLayout.preview.education'), options: [['standard', t('resumeLayout.preview.standard')], ['compact', t('resumeLayout.preview.compact')]], value: customOptions.education, set: (v: string) => setCustomOptions(o => ({ ...o, education: v as CustomEduStyle })) },
                { label: t('resumeLayout.preview.summary'), options: [['paragraph', t('resumeLayout.preview.para')], ['callout', t('resumeLayout.preview.callout')]], value: customOptions.summary, set: (v: string) => setCustomOptions(o => ({ ...o, summary: v as CustomSummaryStyle })) },
              ] as { label: string; options: [string, string][]; value: string; set: (v: string) => void }[]
            ).map(group => (
              <div key={group.label} className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{group.label}:</span>
                {group.options.map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => group.set(id)}
                    className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${group.value === id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500'
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
                {styleId === 'classic' && <ClassicLayout r={r} theme={theme} pageMarginsMm={pageMarginsMm} />}
                {styleId === 'modern' && <ModernLayout r={r} theme={theme} pageMarginsMm={pageMarginsMm} />}
                {styleId === 'executive' && <ExecutiveLayout r={r} theme={theme} pageMarginsMm={pageMarginsMm} backgroundColor={layoutBackgroundColor} fullNameColor={fullNameColor} />}
                {styleId === 'minimal' && <MinimalLayout r={r} theme={theme} pageMarginsMm={pageMarginsMm} />}
                {styleId === 'creative' && <CreativeLayout r={r} theme={theme} pageMarginsMm={pageMarginsMm} backgroundColor={layoutBackgroundColor} fullNameColor={fullNameColor} />}
                {styleId === 'elegant' && <ElegantLayout r={r} theme={theme} pageMarginsMm={pageMarginsMm} />}
                {styleId === 'academic' && <AcademicLayout r={r} theme={theme} pageMarginsMm={pageMarginsMm} />}
                {styleId === 'split' && <SplitLayout r={r} theme={theme} pageMarginsMm={pageMarginsMm} />}
                {styleId === 'timeline' && <TimelineLayout r={r} theme={theme} pageMarginsMm={pageMarginsMm} />}
                {styleId === 'custom' && <CustomLayout r={r} theme={theme} pageMarginsMm={pageMarginsMm} backgroundColor={layoutBackgroundColor} fullNameColor={fullNameColor} options={customOptions} />}
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
                panelTitle={t('resumeLayout.preview.sections')}
                sectionLabels={{
                  personalInfo: sectionTitle(r, 'personalInfo', t('resumeLayout.sectionLabels.personalInfo')),
                  summary: sectionTitle(r, 'summary', t('resumeLayout.sectionLabels.summary')),
                  coreHighlights: sectionTitle(r, 'coreHighlights', t('resumeLayout.sectionLabels.coreHighlights')),
                  experience: sectionTitle(r, 'experience', t('resumeLayout.sectionLabels.experience')),
                  education: sectionTitle(r, 'education', t('resumeLayout.sectionLabels.education')),
                  skills: sectionTitle(r, 'skills', t('resumeLayout.sectionLabels.skills')),
                  projects: sectionTitle(r, 'projects', t('resumeLayout.sectionLabels.projects')),
                  certifications: sectionTitle(r, 'certifications', t('resumeLayout.sectionLabels.certifications')),
                  languages: sectionTitle(r, 'languages', t('resumeLayout.sectionLabels.languages')),
                  achievements: sectionTitle(r, 'achievements', t('resumeLayout.sectionLabels.achievements')),
                  interests: sectionTitle(r, 'interests', t('resumeLayout.sectionLabels.interests')),
                  referees: sectionTitle(r, 'referees', t('resumeLayout.sectionLabels.referees')),
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Mini module list for drag-reorder in preview ────────────────────────────

function MiniModuleList({ sectionOrder, dragKey, dragOverKey, onDragStart, onDragOver, onDrop, onDragEnd, panelTitle, sectionLabels }: {
  sectionOrder: ResumeSection[];
  dragKey: ResumeSection | null;
  dragOverKey: ResumeSection | null;
  onDragStart: (key: ResumeSection) => void;
  onDragOver: (key: ResumeSection) => void;
  onDrop: (key: ResumeSection) => void;
  onDragEnd: () => void;
  panelTitle: string;
  sectionLabels: Record<ResumeSection, string>;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm w-[120px] p-2">
      <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 px-0.5">{panelTitle}</div>
      {sectionOrder.map(key => (
        <div
          key={key}
          className={`flex items-center gap-1 py-0.5 px-0.5 rounded transition-colors ${dragOverKey === key && dragKey !== key ? 'bg-emerald-50 dark:bg-emerald-950/40' : ''
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
          <span className="text-[11px] text-gray-600 dark:text-gray-300 truncate leading-5">{sectionLabels[key]}</span>
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
