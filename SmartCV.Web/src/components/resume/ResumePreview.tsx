import { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DownloadOutlined } from '@ant-design/icons';
import { ChevronDown, Clipboard, FileText, FileDown, Database, FileJson, Lock, Share2 } from 'lucide-react';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';
import type { Resume, ResumeSection } from '../../types/resume';
import { DEFAULT_SECTION_ORDER } from '../../types/resume';
import HoverMenu from '../ui/HoverMenu';
import Modal from '../ui/Modal';
import { sectionTitle } from './resumeShared';
import { exportResumeAsDocx } from '../../services/docx/docxExport';
import { buildShareUrl, encodeSharePayload } from '../../lib/shareLink';
import {
  deriveTheme, STYLES,
  type StyleId, type CustomOptions, type CustomHeader, type CustomExp,
  type CustomSectionStyle, type CustomSkillsStyle,
  type CustomEduStyle, type CustomSummaryStyle, type ThemeColors,
  type PageMarginsMm, DEFAULT_PAGE_MARGINS_MM,
} from './resumeTypes';
import { ClassicLayout } from './layouts/ClassicLayout';
import { ModernLayout } from './layouts/ModernLayout';
import { ExecutiveLayout } from './layouts/ExecutiveLayout';
import { MinimalLayout } from './layouts/MinimalLayout';
import { ElegantLayout } from './layouts/ElegantLayout';
import { AcademicLayout } from './layouts/AcademicLayout';
import { SplitLayout } from './layouts/SplitLayout';
import { TimelineLayout } from './layouts/TimelineLayout';
import { CustomLayout } from './layouts/CustomLayout';
import { PAGE_SIZES, type PageSizeId, MIN_PAGE_MARGIN_MM, MAX_PAGE_MARGIN_MM, API_BASE } from './preview/constants';
import { buildResumePrintHtml } from './preview/printHtml';
import { MiniModuleList } from './preview/MiniModuleList';

export { TemplatePreview } from './preview/TemplatePreview';
export { deriveTheme };
export type { ThemeColors };

interface ResumePreviewProps {
  resume: Resume;
  onChange?: (resume: Resume) => void;
  onExport?: (filename: string) => void;
  onExportData?: () => void;
  onExportJsonResume?: () => void;
  exportingData?: boolean;
}

export default function ResumePreview({
  resume: r,
  onChange,
  onExport,
  onExportData,
  onExportJsonResume,
  exportingData,
}: ResumePreviewProps) {
  const { t } = useTranslation();
  const printRef = useRef<HTMLDivElement>(null);
  const scaleWrapRef = useRef<HTMLDivElement>(null);
  const [styleId, setStyleId] = useState<StyleId>('classic');
  const [mainColor, setMainColor] = useState('#047857');
  const [backgroundColor, setBackgroundColor] = useState<string | null>(null);
  const [fullNameColor, setFullNameColor] = useState('#ffffff');
  const [downloading, setDownloading] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareQr, setShareQr] = useState<string | null>(null);
  const [dragKey, setDragKey] = useState<ResumeSection | null>(null);
  const [dragOverKey, setDragOverKey] = useState<ResumeSection | null>(null);
  const [scale, setScale] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeId>('a4');
  const [paperHeight, setPaperHeight] = useState(297 * (96 / 25.4)); // A4 height px
  const [pageMarginsMm, setPageMarginsMm] = useState<PageMarginsMm>(DEFAULT_PAGE_MARGINS_MM);
  const [marginDraft, setMarginDraft] = useState<Record<keyof PageMarginsMm, string>>(() => {
    const d = DEFAULT_PAGE_MARGINS_MM;
    return { top: String(d.top), bottom: String(d.bottom), left: String(d.left), right: String(d.right) };
  });

  // Recompute scale whenever the clip wrapper resizes or the page size changes
  useEffect(() => {
    const el = scaleWrapRef.current;
    if (!el) return;
    const paperWidthPx = PAGE_SIZES[pageSize].widthPx;
    const obs = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / paperWidthPx)));
    obs.observe(el);
    setScale(Math.min(1, el.clientWidth / paperWidthPx));
    return () => obs.disconnect();
  }, [pageSize]);

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
    skillsStyle: 'list',
    education: 'standard',
    summary: 'paragraph',
  });
  const theme = deriveTheme(mainColor);
  const layoutBackgroundColor = backgroundColor ?? theme.dark;
  const sectionOrder = r.sectionOrder ?? DEFAULT_SECTION_ORDER;
  const supportsBackgroundColor =
    styleId === 'executive';
  const updatePageMarginDraft = (side: keyof PageMarginsMm, value: string) => {
    setMarginDraft(d => ({ ...d, [side]: value }));
  };

  const applyMarginPreset = (margins: PageMarginsMm) => {
    setPageMarginsMm(margins);
    setMarginDraft({
      top: String(margins.top),
      bottom: String(margins.bottom),
      left: String(margins.left),
      right: String(margins.right),
    });
  };

  const commitPageMargin = (side: keyof PageMarginsMm) => {
    const raw = marginDraft[side];
    const next = parseFloat(raw);
    const clamped = Number.isNaN(next)
      ? pageMarginsMm[side]
      : Math.min(MAX_PAGE_MARGIN_MM, Math.max(MIN_PAGE_MARGIN_MM, next));
    setPageMarginsMm(margins => ({ ...margins, [side]: clamped }));
    setMarginDraft(d => ({ ...d, [side]: String(clamped) }));
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
      clone.style.width = 'auto';
      clone.style.minHeight = '';
      const layoutRoot = clone.firstElementChild as HTMLElement | null;
      if (layoutRoot) {
        layoutRoot.style.minHeight = '';
        if (styleId !== 'executive') {
          layoutRoot.style.padding = '0';
        }
      }

      const html = buildResumePrintHtml(clone.outerHTML, PAGE_SIZES[pageSize].pageCss, pageMarginsMm);

      const filename = `${r.personalInfo.fullName || 'resume'}.pdf`;

      const res = await fetch(`${API_BASE}/pdf/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, filename }),
      });

      if (!res.ok) {
        let detail = '';
        try {
          const data = await res.json();
          detail = typeof data?.error === 'string' ? `: ${data.error}` : '';
        } catch {
          detail = res.statusText ? `: ${res.statusText}` : '';
        }
        throw new Error(`PDF generation failed${detail}`);
      }

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

  const handleDownloadDocx = async () => {
    setDownloadingDocx(true);
    try {
      const blob = await exportResumeAsDocx(r, {
        pageSize,
        pageMarginsMm,
        accentColor: mainColor,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${r.personalInfo.fullName || 'resume'}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'DOCX export failed');
    } finally {
      setDownloadingDocx(false);
    }
  };

  const handleShare = async () => {
    try {
      const encoded = await encodeSharePayload({
        resume: r,
        styleId,
        mainColor,
        pageSize,
        pageMarginsMm,
        backgroundColor,
        fullNameColor,
      });
      const url = buildShareUrl(encoded);
      setShareUrl(url);
      // QR codes top out around 2.9KB; longer URLs still work as plain links.
      let qr: string | null = null;
      if (url.length <= 1800) {
        try {
          qr = await QRCode.toDataURL(url, { width: 220, margin: 1 });
        } catch {
          qr = null;
        }
      }
      setShareQr(qr);
      setShareOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create share link');
    }
  };

  const handleCopyShareUrl = async () => {
    await navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied');
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
          <div className="shrink-0">
            <HoverMenu
              align="right"
              trigger={
                <>
                  {(downloading || exportingData)
                    ? <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    : <DownloadOutlined style={{ fontSize: '16px' }} />}
                  {t('resumeLayout.preview.download')}
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </>
              }
              items={[
                {
                  label: downloading ? t('resumeLayout.preview.generating') : t('resumeLayout.preview.downloadPdfItem'),
                  icon: <FileText className="w-3.5 h-3.5 text-emerald-500" />,
                  onClick: handleDownloadPDF,
                  loading: downloading,
                  title: 'Download this resume as a PDF',
                },
                {
                  label: downloadingDocx ? t('resumeLayout.preview.generating') : t('resumeLayout.preview.downloadDocxItem'),
                  icon: <FileDown className="w-3.5 h-3.5 text-blue-500" />,
                  onClick: handleDownloadDocx,
                  loading: downloadingDocx,
                  title: 'Download this resume as a Word document',
                },
                {
                  label: t('resumeLayout.preview.shareLink'),
                  icon: <Share2 className="w-3.5 h-3.5 text-violet-500" />,
                  onClick: handleShare,
                  title: 'Create a read-only share link — the resume is encoded in the link itself, nothing is uploaded',
                },
                ...(onExportData ? [{
                  label: t('resumeLayout.preview.exportAllData'),
                  icon: <Database className="w-3.5 h-3.5 text-amber-500" />,
                  onClick: onExportData,
                  loading: exportingData,
                  title: 'Export all resume data from IndexedDB',
                }] : []),
                ...(onExportJsonResume ? [{
                  label: t('resumeLayout.preview.exportJsonResume'),
                  icon: <FileJson className="w-3.5 h-3.5 text-sky-500" />,
                  onClick: onExportJsonResume,
                  title: 'Export this resume in the JSON Resume standard (jsonresume.org)',
                }] : []),
              ]}
            />
          </div>
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

        {/* Page size + margins */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{t('resumeLayout.preview.pageSize')}</span>
          {(Object.keys(PAGE_SIZES) as PageSizeId[]).map(id => (
            <button
              key={id}
              onClick={() => setPageSize(id)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${pageSize === id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500'
                }`}
            >
              {PAGE_SIZES[id].label}
            </button>
          ))}
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 shrink-0">{t('resumeLayout.preview.pageMargins')}</span>
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
                step="0.1"
                value={marginDraft[side]}
                onChange={e => updatePageMarginDraft(side, e.target.value)}
                onBlur={() => commitPageMargin(side)}
                className="w-14 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-1.5 py-0.5 text-xs text-gray-700 dark:text-gray-200"
              />
            </label>
          ))}
          <span className="text-xs text-gray-400 dark:text-gray-500">{t('resumeLayout.preview.mm')}</span>
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 shrink-0">{t('resumeLayout.preview.presets')}</span>
          {(
            [
              [t('resumeLayout.preview.presetNormal'), { top: 25.4, bottom: 25.4, left: 25.4, right: 25.4 }],
              [t('resumeLayout.preview.presetModerate'), DEFAULT_PAGE_MARGINS_MM],
              [t('resumeLayout.preview.presetNarrow'), { top: 12.7, bottom: 12.7, left: 12.7, right: 12.7 }],
              [t('resumeLayout.preview.presetCompact'), { top: 8, bottom: 8, left: 8, right: 8 }],
            ] as [string, PageMarginsMm][]
          ).map(([label, margins]) => (
            <button
              key={label}
              onClick={() => applyMarginPreset(margins)}
              className="px-2 py-0.5 rounded text-xs font-medium transition-all bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500"
            >
              {label}
            </button>
          ))}
        </div>

        {/* Custom layout options */}
        {styleId === 'custom' && (
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1 border-t border-gray-200 dark:border-gray-700">
            {(
              [
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
            <div style={{ width: PAGE_SIZES[pageSize].widthCss, flexShrink: 0, transformOrigin: 'top center', transform: `scale(${scale})` }}>
              <div ref={printRef} className="bg-white" style={{ width: PAGE_SIZES[pageSize].widthCss, minHeight: PAGE_SIZES[pageSize].minHeightCss }}>
                {styleId === 'classic' && <ClassicLayout r={r} theme={theme} pageMarginsMm={pageMarginsMm} />}
                {styleId === 'modern' && <ModernLayout r={r} theme={theme} pageMarginsMm={pageMarginsMm} />}
                {styleId === 'executive' && <ExecutiveLayout r={r} theme={theme} pageMarginsMm={pageMarginsMm} backgroundColor={layoutBackgroundColor} fullNameColor={fullNameColor} />}
                {styleId === 'minimal' && <MinimalLayout r={r} theme={theme} pageMarginsMm={pageMarginsMm} />}
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

      {/* Share link modal */}
      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title="Share Resume" size="md">
        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-lg text-sm">
            <Lock className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              The resume is compressed into the link itself (after the #), so it is never uploaded
              to any server. Anyone with the link sees a read-only copy and can import it into
              their own SmartCV.
            </span>
          </div>

          <div className="flex gap-2">
            <input
              readOnly
              value={shareUrl}
              onFocus={e => e.target.select()}
              className="flex-1 min-w-0 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 font-mono"
            />
            <button
              onClick={handleCopyShareUrl}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shrink-0"
            >
              <Clipboard className="w-3.5 h-3.5" />
              Copy
            </button>
          </div>

          {shareQr ? (
            <div className="flex flex-col items-center gap-2">
              <img src={shareQr} alt="QR code for the share link" className="rounded-lg border border-gray-200 dark:border-gray-700" />
              <p className="text-xs text-gray-400 dark:text-gray-500">Scan to open on another device</p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
              This resume is too large for a QR code — use the copy button instead.
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}

