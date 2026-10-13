import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Download, FileText, FileDown, Database, FileJson, Share2 } from 'lucide-react';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';
import type { Resume, ResumeSection } from '../../types/resume';
import { DEFAULT_SECTION_ORDER } from '../../types/resume';
import HoverMenu from '../ui/HoverMenu';
import { sectionTitle } from './resumeShared';
import { exportResumeAsDocx } from '../../services/docx/docxExport';
import { buildPrintDocument, renderPdf } from '../../services/pdf/pdfExport';
import { downloadBlob } from '../../lib/download';
import { buildShareUrl, encodeSharePayload } from '../../lib/shareLink';
import {
  deriveTheme,
  type StyleId, type CustomOptions, type ThemeColors,
  type PageMarginsMm, DEFAULT_PAGE_MARGINS_MM,
} from './resumeTypes';
import { PAGE_SIZES, type PageSizeId } from './preview/constants';
import { MiniModuleList } from './preview/MiniModuleList';
import { TemplatePreview, DEFAULT_CUSTOM_OPTIONS } from './preview/TemplatePreview';
import { StylePicker, ColourControls, PageSetup, CustomOptionsBar } from './preview/PreviewToolbar';
import { ShareDialog } from './preview/ShareDialog';
import { usePaperScale } from './preview/usePaperScale';
import { useSectionDrag } from './preview/useSectionDrag';

export { TemplatePreview } from './preview/TemplatePreview';
export { deriveTheme };
export type { ThemeColors };

// QR codes top out around 2.9KB; longer URLs still work as plain links.
const MAX_QR_URL_LENGTH = 1800;

const SECTION_KEYS: ResumeSection[] = [
  'personalInfo', 'summary', 'coreHighlights', 'experience', 'education', 'skills', 'projects',
  'certifications', 'languages', 'achievements', 'interests', 'referees',
];

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
  const [styleId, setStyleId] = useState<StyleId>('classic');
  const [mainColor, setMainColor] = useState('#047857');
  const [backgroundColor, setBackgroundColor] = useState<string | null>(null);
  const [fullNameColor, setFullNameColor] = useState('#ffffff');
  const [customOptions, setCustomOptions] = useState<CustomOptions>(DEFAULT_CUSTOM_OPTIONS);
  const [pageSize, setPageSize] = useState<PageSizeId>('a4');
  const [pageMarginsMm, setPageMarginsMm] = useState<PageMarginsMm>(DEFAULT_PAGE_MARGINS_MM);
  const [downloading, setDownloading] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [share, setShare] = useState<{ url: string; qr: string | null } | null>(null);

  const { wrapRef, paperRef, scale, paperHeight } = usePaperScale(pageSize);
  const sectionOrder = r.sectionOrder ?? DEFAULT_SECTION_ORDER;
  const drag = useSectionDrag(sectionOrder, order => onChange?.({ ...r, sectionOrder: order }));

  const theme = deriveTheme(mainColor);
  const layoutBackgroundColor = backgroundColor ?? theme.dark;
  const fileBaseName = r.personalInfo.fullName || 'resume';

  const handleDownloadPDF = async () => {
    const paper = paperRef.current;
    if (!paper) return;
    setDownloading(true);
    try {
      const filename = `${fileBaseName}.pdf`;
      const html = buildPrintDocument(paper, { styleId, pageSize, pageMarginsMm });
      downloadBlob(await renderPdf(html, filename), filename);
      onExport?.(filename);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('app.export.pdfFailed'));
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadDocx = async () => {
    setDownloadingDocx(true);
    try {
      const blob = await exportResumeAsDocx(r, { pageSize, pageMarginsMm, accentColor: mainColor });
      downloadBlob(blob, `${fileBaseName}.docx`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('app.export.docxFailed'));
    } finally {
      setDownloadingDocx(false);
    }
  };

  const handleShare = async () => {
    try {
      const url = buildShareUrl(await encodeSharePayload({
        resume: r,
        styleId,
        mainColor,
        pageSize,
        pageMarginsMm,
        backgroundColor,
        fullNameColor,
        customOptions,
      }));
      const qr = url.length <= MAX_QR_URL_LENGTH
        ? await QRCode.toDataURL(url, { width: 220, margin: 1 }).catch(() => null)
        : null;
      setShare({ url, qr });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('app.share.failed'));
    }
  };

  const sectionLabels = Object.fromEntries(
    SECTION_KEYS.map(key => [key, sectionTitle(r, key, t(`resumeLayout.sectionLabels.${key}`))]),
  ) as Record<ResumeSection, string>;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between gap-2">
          <StylePicker styleId={styleId} onChange={setStyleId} />
          <div className="shrink-0">
            <HoverMenu
              align="right"
              trigger={
                <>
                  {(downloading || exportingData)
                    ? <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    : <Download className="w-4 h-4" />}
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
                  title: t('app.export.pdfTitle'),
                },
                {
                  label: downloadingDocx ? t('resumeLayout.preview.generating') : t('resumeLayout.preview.downloadDocxItem'),
                  icon: <FileDown className="w-3.5 h-3.5 text-blue-500" />,
                  onClick: handleDownloadDocx,
                  loading: downloadingDocx,
                  title: t('app.export.docxTitle'),
                },
                {
                  label: t('resumeLayout.preview.shareLink'),
                  icon: <Share2 className="w-3.5 h-3.5 text-violet-500" />,
                  onClick: handleShare,
                  title: t('app.export.shareTitle'),
                },
                ...(onExportData ? [{
                  label: t('resumeLayout.preview.exportAllData'),
                  icon: <Database className="w-3.5 h-3.5 text-amber-500" />,
                  onClick: onExportData,
                  loading: exportingData,
                  title: t('app.export.allDataTitle'),
                }] : []),
                ...(onExportJsonResume ? [{
                  label: t('resumeLayout.preview.exportJsonResume'),
                  icon: <FileJson className="w-3.5 h-3.5 text-sky-500" />,
                  onClick: onExportJsonResume,
                  title: t('app.export.jsonResumeTitle'),
                }] : []),
              ]}
            />
          </div>
        </div>

        <ColourControls
          mainColor={mainColor}
          onMainColor={setMainColor}
          executive={styleId === 'executive' ? {
            backgroundColor: layoutBackgroundColor,
            onBackgroundColor: setBackgroundColor,
            fullNameColor,
            onFullNameColor: setFullNameColor,
          } : undefined}
        />

        <PageSetup pageSize={pageSize} onPageSize={setPageSize} margins={pageMarginsMm} onMargins={setPageMarginsMm} />

        {styleId === 'custom' && <CustomOptionsBar options={customOptions} onChange={setCustomOptions} />}
      </div>

      {/* Resume Paper */}
      <div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-950">
        <div className="flex items-start gap-3 px-4 py-4 min-h-full">
          {/*
            wrapRef clips overflow and drives the scale calculation. The transform is on an
            inner div so paperRef stays transform-free (its outerHTML goes to the PDF
            renderer at 100% size).
          */}
          <div
            ref={wrapRef}
            className="flex-1 min-w-0 overflow-hidden shadow-lg flex justify-center"
            style={{ height: `${paperHeight * scale}px` }}
          >
            <div style={{ width: PAGE_SIZES[pageSize].widthCss, flexShrink: 0, transformOrigin: 'top center', transform: `scale(${scale})` }}>
              <div ref={paperRef} className="bg-white" style={{ width: PAGE_SIZES[pageSize].widthCss, minHeight: PAGE_SIZES[pageSize].minHeightCss }}>
                <TemplatePreview
                  resume={r}
                  styleId={styleId}
                  theme={theme}
                  pageMarginsMm={pageMarginsMm}
                  backgroundColor={styleId === 'executive' || styleId === 'custom' ? layoutBackgroundColor : undefined}
                  fullNameColor={styleId === 'executive' || styleId === 'custom' ? fullNameColor : undefined}
                  customOptions={customOptions}
                />
              </div>
            </div>
          </div>
          {onChange && (
            <div className="sticky top-4 self-start shrink-0">
              <MiniModuleList
                sectionOrder={sectionOrder}
                {...drag}
                panelTitle={t('resumeLayout.preview.sections')}
                sectionLabels={sectionLabels}
              />
            </div>
          )}
        </div>
      </div>

      <ShareDialog open={share !== null} onClose={() => setShare(null)} url={share?.url ?? ''} qrDataUrl={share?.qr ?? null} />
    </div>
  );
}
