import { ArrowRight, Send, Upload } from 'lucide-react';
import type { Translate } from './i18n';

// The illustrative mini-mockup shown inside each feature card. `type` selects
// which mockup to render; the blocks are mutually exclusive.
export function FunctionPreview({ type, t }: { type: string; t: Translate }) {
  return (
    <>
      {type === 'versions' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-700">{t('landing.functions.preview.versions.role')}</span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{t('landing.functions.preview.versions.active')}</span>
          </div>
          {[
            [t('landing.functions.preview.versions.master'), t('landing.functions.preview.versions.base'), '72%'],
            [t('landing.functions.preview.versions.frontend'), t('landing.functions.preview.versions.tailored'), '91%'],
            [t('landing.functions.preview.versions.platform'), t('landing.functions.preview.versions.draft'), '84%'],
          ].map(([name, status, score]) => (
            <div key={name} className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[11px] font-semibold text-gray-700">{name}</span>
                <span className="text-[10px] font-bold text-emerald-600">{score}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] text-gray-500">{status}</span>
                <div className="h-1 flex-1 rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: score }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {type === 'ats' && (
        <div className="grid h-full grid-cols-[92px_1fr] gap-3">
          <div className="flex flex-col items-center justify-center rounded-lg bg-white border border-gray-200">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-[6px] border-emerald-500 text-lg font-extrabold text-gray-900">92</div>
            <span className="mt-2 text-[10px] font-semibold text-gray-500">{t('landing.functions.preview.ats.score')}</span>
          </div>
          <div className="space-y-2.5 self-center">
            {[
              [t('landing.functions.preview.ats.keywords'), '88%'],
              [t('landing.functions.preview.ats.format'), '96%'],
              [t('landing.functions.preview.ats.sections'), '90%'],
              [t('landing.functions.preview.ats.readability'), '86%'],
            ].map(([label, width]) => (
              <div key={label}>
                <div className="mb-1 flex justify-between text-[10px] font-semibold text-gray-500">
                  <span>{label}</span>
                  <span>{width}</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-200">
                  <div className="h-full rounded-full bg-cyan-500" style={{ width }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {type === 'cover' && (
        <div className="h-full rounded-lg border border-indigo-100 bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-500">{t('landing.functions.preview.cover.label')}</p>
              <p className="text-xs font-bold text-gray-800">{t('landing.functions.preview.cover.role')}</p>
            </div>
            <span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-600">{t('landing.functions.preview.cover.tone')}</span>
          </div>
          <div className="space-y-2 text-[10px] leading-relaxed text-gray-500">
            <p>{t('landing.functions.preview.cover.greeting')}</p>
            <p>{t('landing.functions.preview.cover.body')}</p>
            <div className="h-2 w-full rounded bg-gray-100" />
            <div className="h-2 w-5/6 rounded bg-gray-100" />
          </div>
          <div className="absolute bottom-6 right-6 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[10px] font-bold text-white shadow-lg shadow-indigo-200">
            {t('landing.functions.preview.cover.generate')}
          </div>
        </div>
      )}

      {type === 'interview' && (
        <div className="space-y-2">
          {[
            [t('landing.functions.preview.interview.behavioral'), t('landing.functions.preview.interview.behavioralQuestion')],
            [t('landing.functions.preview.interview.technical'), t('landing.functions.preview.interview.technicalQuestion')],
            [t('landing.functions.preview.interview.fit'), t('landing.functions.preview.interview.fitQuestion')],
          ].map(([tag, question]) => (
            <div key={tag} className="rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm">
              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">{tag}</span>
              <p className="mt-1.5 text-[11px] font-medium leading-snug text-gray-700">{question}</p>
            </div>
          ))}
        </div>
      )}

      {type === 'optimize' && (
        <div className="grid h-full grid-rows-2 gap-2">
          <div className="rounded-lg border border-red-100 bg-white p-2.5">
            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-red-500">{t('landing.functions.preview.optimize.before')}</span>
            <p className="mt-1 text-[11px] leading-snug text-gray-500">{t('landing.functions.preview.optimize.beforeText')}</p>
          </div>
          <div className="rounded-lg border border-teal-100 bg-white p-2.5 shadow-sm">
            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-teal-600">{t('landing.functions.preview.optimize.after')}</span>
            <p className="mt-1 text-[11px] leading-snug text-gray-700">{t('landing.functions.preview.optimize.afterText')}</p>
          </div>
        </div>
      )}

      {type === 'pdf' && (
        <div className="flex h-full flex-col justify-between">
          <div className="rounded-lg border border-dashed border-rose-200 bg-white p-4 text-center">
            <Upload className="mx-auto h-6 w-6 text-rose-500" />
            <p className="mt-2 text-[11px] font-bold text-gray-700">{t('landing.functions.preview.pdf.file')}</p>
            <p className="mt-1 text-[10px] text-gray-400">{t('landing.functions.preview.pdf.parsed')}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-white p-2 text-center text-[10px] font-bold text-gray-600 border border-gray-200">{t('landing.functions.preview.pdf.import')}</div>
            <div className="rounded-lg bg-rose-600 p-2 text-center text-[10px] font-bold text-white">{t('landing.functions.preview.pdf.export')}</div>
          </div>
        </div>
      )}

      {type === 'proofread' && (
        <div className="flex h-full flex-col justify-between">
          <div className="space-y-2">
            {[
              [t('landing.functions.preview.proofread.spelling'), t('landing.functions.preview.proofread.spellingFix')],
              [t('landing.functions.preview.proofread.grammar'), t('landing.functions.preview.proofread.grammarFix')],
              [t('landing.functions.preview.proofread.clarity'), t('landing.functions.preview.proofread.clarityFix')],
            ].map(([tag, fix]) => (
              <div key={tag} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
                <span className="shrink-0 rounded bg-sky-50 px-1.5 py-0.5 text-[9px] font-bold text-sky-700">{tag}</span>
                <p className="truncate text-[10px] font-medium text-gray-600">{fix}</p>
              </div>
            ))}
          </div>
          <div className="ml-auto rounded-lg bg-sky-600 px-2.5 py-1.5 text-[10px] font-bold text-white shadow-lg shadow-sky-200">
            {t('landing.functions.preview.proofread.applyAll')}
          </div>
        </div>
      )}

      {type === 'email' && (
        <div className="flex h-full flex-col gap-2">
          <div className="flex flex-wrap gap-1.5">
            {[
              [t('landing.functions.preview.email.thankYou'), true],
              [t('landing.functions.preview.email.followUp'), false],
              [t('landing.functions.preview.email.referral'), false],
            ].map(([tag, active]) => (
              <span key={String(tag)} className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${active ? 'bg-violet-600 text-white' : 'border border-gray-200 bg-white text-gray-500'}`}>
                {tag}
              </span>
            ))}
          </div>
          <div className="flex-1 rounded-lg border border-violet-100 bg-white p-2.5 shadow-sm">
            <p className="text-[10px] font-bold text-gray-700">{t('landing.functions.preview.email.subject')}</p>
            <p className="mt-1.5 text-[10px] leading-relaxed text-gray-500">{t('landing.functions.preview.email.body')}</p>
          </div>
          <div className="ml-auto flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1.5 text-[10px] font-bold text-white shadow-lg shadow-violet-200">
            <Send className="h-2.5 w-2.5" /> {t('landing.functions.preview.email.send')}
          </div>
        </div>
      )}

      {type === 'translate' && (
        <div className="flex h-full flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-600">
              <span className="rounded bg-gray-100 px-1.5 py-0.5">{t('landing.functions.preview.translate.from')}</span>
              <ArrowRight className="h-3 w-3 text-orange-500" />
              <span className="rounded bg-orange-50 px-1.5 py-0.5 text-orange-700">{t('landing.functions.preview.translate.to')}</span>
            </div>
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[9px] font-bold text-orange-700">{t('landing.functions.preview.translate.languages')}</span>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm">
            <p className="text-[10px] leading-snug text-gray-500">{t('landing.functions.preview.translate.source')}</p>
          </div>
          <div className="rounded-lg border border-orange-100 bg-white p-2.5 shadow-sm">
            <p className="text-[10px] leading-snug text-gray-700">{t('landing.functions.preview.translate.target')}</p>
          </div>
        </div>
      )}
    </>
  );
}
