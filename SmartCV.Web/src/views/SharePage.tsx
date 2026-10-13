'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Download, Loader2, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import type { SharePayload } from '../lib/shareLink';
import { decodeSharePayload, readShareFragment } from '../lib/shareLink';
import { deriveTheme, TemplatePreview } from '../components/resume/ResumePreview';
import { PAGE_SIZES } from '../components/resume/preview/constants';
import { usePaperScale } from '../components/resume/preview/usePaperScale';
import { resumeDB } from '../services/storage/indexedDB';
import Button from '../components/ui/Button';

export default function SharePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [payload, setPayload] = useState<SharePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const pageSize = payload?.pageSize ?? 'a4';
  const { wrapRef, paperRef, scale, paperHeight } = usePaperScale(pageSize, payload !== null);

  useEffect(() => {
    const load = async () => {
      const encoded = readShareFragment();
      if (!encoded) throw new Error(t('app.shared.missing'));
      try {
        return await decodeSharePayload(encoded);
      } catch {
        throw new Error(t('app.shared.invalid'));
      }
    };
    load().then(setPayload).catch((e: Error) => setError(e.message));
  }, [t]);

  const handleImport = async () => {
    if (!payload) return;
    setImporting(true);
    try {
      const now = new Date().toISOString();
      const copy = {
        ...payload.resume,
        id: crypto.randomUUID(),
        name: `${payload.resume.name} (shared)`,
        createdAt: now,
        updatedAt: now,
        baseResumeId: undefined,
        jobApplicationId: undefined,
      };
      await resumeDB.save(copy);
      toast.success(t('app.shared.imported'));
      router.push(`/editor?id=${encodeURIComponent(copy.id)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('app.shared.importFailed'));
      setImporting(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl max-w-md">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">{t('app.shared.cannotOpen')}</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  const page = PAGE_SIZES[pageSize];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            {t('app.shared.readOnlyNote')}
          </div>
          <Button onClick={handleImport} loading={importing}>
            <Download className="w-4 h-4" />
            {t('app.shared.import')}
          </Button>
        </div>

        <div
          ref={wrapRef}
          className="overflow-hidden shadow-lg flex justify-center"
          style={{ height: `${paperHeight * scale}px` }}
        >
          <div style={{ width: page.widthCss, flexShrink: 0, transformOrigin: 'top center', transform: `scale(${scale})` }}>
            <div ref={paperRef} className="bg-white" style={{ width: page.widthCss, minHeight: page.minHeightCss }}>
              <TemplatePreview
                resume={payload.resume}
                styleId={payload.styleId}
                theme={deriveTheme(payload.mainColor)}
                pageMarginsMm={payload.pageMarginsMm}
                backgroundColor={payload.backgroundColor ?? undefined}
                fullNameColor={payload.fullNameColor}
                customOptions={payload.customOptions}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
