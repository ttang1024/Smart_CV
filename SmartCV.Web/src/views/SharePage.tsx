'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Download, Loader2, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import type { SharePayload } from '../lib/shareLink';
import { decodeSharePayload, readShareFragment } from '../lib/shareLink';
import { deriveTheme, TemplatePreview } from '../components/resume/ResumePreview';
import { resumeDB } from '../services/storage/indexedDB';
import Button from '../components/ui/Button';

const PAGE_WIDTH_PX = { a4: 210 * (96 / 25.4), letter: 8.5 * 96 } as const;
const PAGE_WIDTH_CSS = { a4: '210mm', letter: '8.5in' } as const;
const PAGE_MIN_HEIGHT_CSS = { a4: '297mm', letter: '11in' } as const;

export default function SharePage() {
  const router = useRouter();
  const [payload, setPayload] = useState<SharePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [scale, setScale] = useState(1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const [paperHeight, setPaperHeight] = useState(297 * (96 / 25.4));

  useEffect(() => {
    const load = async () => {
      const encoded = readShareFragment();
      if (!encoded) throw new Error('This link does not contain a shared resume.');
      try {
        return await decodeSharePayload(encoded);
      } catch {
        throw new Error('This share link is invalid or was truncated.');
      }
    };
    load().then(setPayload).catch((e: Error) => setError(e.message));
  }, []);

  const pageSize = payload?.pageSize ?? 'a4';

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !payload) return;
    const widthPx = PAGE_WIDTH_PX[pageSize];
    const obs = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / widthPx)));
    obs.observe(el);
    return () => obs.disconnect();
  }, [payload, pageSize]);

  useEffect(() => {
    const el = paperRef.current;
    if (!el || !payload) return;
    const obs = new ResizeObserver(() => setPaperHeight(el.scrollHeight));
    obs.observe(el);
    return () => obs.disconnect();
  }, [payload]);

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
      toast.success('Resume imported');
      router.push(`/editor?id=${encodeURIComponent(copy.id)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Import failed');
      setImporting(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl max-w-md">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Cannot open shared resume</p>
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

  const theme = deriveTheme(payload.mainColor);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Read-only shared resume — the data lives in this link, nothing was uploaded.
          </div>
          <Button onClick={handleImport} loading={importing}>
            <Download className="w-4 h-4" />
            Import into SmartCV
          </Button>
        </div>

        <div
          ref={wrapRef}
          className="overflow-hidden shadow-lg flex justify-center"
          style={{ height: `${paperHeight * scale}px` }}
        >
          <div style={{ width: PAGE_WIDTH_CSS[pageSize], flexShrink: 0, transformOrigin: 'top center', transform: `scale(${scale})` }}>
            <div
              ref={paperRef}
              className="bg-white"
              style={{ width: PAGE_WIDTH_CSS[pageSize], minHeight: PAGE_MIN_HEIGHT_CSS[pageSize] }}
            >
              <TemplatePreview
                resume={payload.resume}
                styleId={payload.styleId}
                theme={theme}
                pageMarginsMm={payload.pageMarginsMm}
                backgroundColor={payload.backgroundColor ?? undefined}
                fullNameColor={payload.fullNameColor}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
