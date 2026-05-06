import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { parseResumeFromPdf } from '../../services/pdf/resumeParserApi';
import { useResumeStore } from '../../store/resumeStore';
import { useSettingsStore } from '../../store/settingsStore';
import type { Resume } from '../../types/resume';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

interface PDFImportProps {
  /** Called after a new resume is saved. Mutually exclusive with onFill. */
  onImported?: (resumeId: string) => void;
  /** Called with parsed resume data instead of saving. Use this to fill an existing form. */
  onFill?: (resume: Resume) => void;
  label?: string;
}

type Step = 'idle' | 'parsing' | 'saving' | 'done' | 'error';

export default function PDFImport({ onImported, onFill, label }: PDFImportProps) {
  const { t } = useTranslation();
  const defaultLabel = label ?? t('pdfImport.button');

  const STEP_LABELS: Record<Step, string> = {
    idle: '',
    parsing: t('pdfImport.parsing'),
    saving: t('pdfImport.saving'),
    done: t('pdfImport.done'),
    error: '',
  };
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { saveResume } = useResumeStore();
  const useAI = useSettingsStore(state => state.aiSettings.useAI);

  const reset = () => { setStep('idle'); setError(null); setFileName(null); };

  const processFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError(t('pdfImport.pdfOnly'));
      setStep('error');
      return;
    }

    setFileName(file.name);
    setError(null);

    try {
      setStep('parsing');
      const resume = await parseResumeFromPdf(file, { useAI });

      if (onFill) {
        setStep('done');
        setTimeout(() => { setOpen(false); reset(); onFill(resume); }, 1200);
      } else {
        setStep('saving');
        await saveResume(resume);
        setStep('done');
        setTimeout(() => { setOpen(false); reset(); onImported?.(resume.id); }, 1200);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('pdfImport.failed'));
      setStep('error');
    }
  }, [saveResume, onImported, onFill, useAI, t]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const progressSteps = onFill ? [t('pdfImport.stepParse')] : [t('pdfImport.stepParse'), t('pdfImport.stepSave')];
  const activeSteps = onFill ? ['parsing'] : ['parsing', 'saving'];
  const isProcessing = activeSteps.includes(step);

  return (
    <>
      <Button variant="outline" onClick={() => { reset(); setOpen(true); }}>
        <Upload className="w-4 h-4" />
        {defaultLabel}
      </Button>

      <Modal
        open={open}
        onClose={() => { if (!isProcessing) { setOpen(false); reset(); } }}
        title={t('pdfImport.modalTitle')}
        size="md"
      >
        <div className="space-y-4">
          {/* Drop zone */}
          {(step === 'idle' || step === 'error') ? (
            <>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-all',
                  dragging
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-emerald-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                )}
              >
                <div className={cn(
                  'w-14 h-14 rounded-full flex items-center justify-center transition-colors',
                  dragging ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-gray-100 dark:bg-gray-800'
                )}>
                  <FileText className={cn('w-7 h-7', dragging ? 'text-emerald-600' : 'text-gray-400')} />
                </div>
                <div className="text-center">
                  <p className="font-medium text-gray-900 dark:text-white">{t('pdfImport.dropTitle')}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {t('pdfImport.dropOr')} <span className="text-emerald-600 dark:text-emerald-400">{t('pdfImport.dropBrowse')}</span>
                  </p>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">{t('pdfImport.dropSupports')}</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              {step === 'error' && error && (
                <div className="flex items-start gap-2.5 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">{t('pdfImport.failed')}</p>
                    <p className="mt-0.5 text-red-600 dark:text-red-300">{error}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Processing / done state */
            <div className="py-6 flex flex-col items-center gap-5">
              <AnimatePresence mode="wait">
                {step === 'done' ? (
                  <motion.div
                    key="done"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"
                  >
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="loading"
                    className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center"
                  >
                    <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="text-center space-y-1">
                {fileName && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 justify-center">
                    <FileText className="w-3.5 h-3.5" />
                    {fileName}
                  </p>
                )}
                <p className="font-medium text-gray-900 dark:text-white">
                  {STEP_LABELS[step]}
                </p>
              </div>

              {/* Progress bar */}
              <div className="flex items-center gap-2 w-full max-w-xs">
                {progressSteps.map((label, i) => {
                  const stepIdx = activeSteps.indexOf(step);
                  const isDone = step === 'done' || i < stepIdx;
                  const isActive = activeSteps[i] === step;
                  return (
                    <div key={label} className="flex-1 flex flex-col items-center gap-1">
                      <div className={cn(
                        'w-full h-1.5 rounded-full transition-colors duration-500',
                        isDone || isActive ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'
                      )} />
                      <span className={cn(
                        'text-xs',
                        isActive ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-gray-400'
                      )}>
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            {t('pdfImport.note')}
          </p>
        </div>
      </Modal>
    </>
  );
}
