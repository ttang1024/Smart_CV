'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ChevronDown, Database, FileJson, FileText, PanelRight, Redo2, Save, Undo2, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useResumeStore } from '../store/resumeStore';
import type { Resume } from '../types/resume';
import type { OptimizationSession, OptimizationSuggestion } from '../types/ai';
import type { JobApplication } from '../types/jobApplication';
import ResumeEditor from '../components/resume/ResumeEditor';
import ResumePreview from '../components/resume/ResumePreview';
import PDFImport, { type PDFImportHandle } from '../components/resume/PDFImport';
import Button from '../components/ui/Button';
import HoverMenu from '../components/ui/HoverMenu';
import Input from '../components/ui/Input';
import { applyFieldCorrection } from '../services/ai/proofreader';
import { applySuggestion } from '../services/ai/applySuggestion';
import { jobApplicationDB, resumeDB, scoreSnapshotDB } from '../services/storage/indexedDB';
import { runAtsCheck } from '../services/ats/atsChecker';
import { toJsonResume } from '../services/jsonResume';
import { exportAllResumes, importResumeFile } from '../services/resumeBackup';
import { downloadJson } from '../lib/download';
import { describeValidationError } from '../lib/resumeSchema';
import { DragDivider } from './editor/DragDivider';
import { usePanelResize } from './editor/usePanelResize';
import { SidePanel, type PanelId, type EditorJobContext } from './editor/SidePanel';
import { useResumeHistory } from './editor/useResumeHistory';
import { useAutosave } from './editor/useAutosave';
import { useEditorShortcuts } from './editor/useEditorShortcuts';

interface ResumeChangeOptions {
  historyLabel?: string;
  forceHistory?: boolean;
  skipHistory?: boolean;
}

const SAVE_ERROR_TOAST_ID = 'resume-save-failed';

/** Run low-priority work when the main thread is idle (ATS scoring after a save). */
const whenIdle = (fn: () => void) =>
  typeof requestIdleCallback === 'function' ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 0);

export default function EditorPage() {
  const searchParams = useSearchParams();
  const id = searchParams?.get('id');
  const router = useRouter();
  const { t } = useTranslation();
  const { currentResume, loadResume, saveResume, saveOptimization } = useResumeStore();
  const [localResume, setLocalResume] = useState<Resume | null>(null);
  const resumeRef = useRef<Resume | null>(null);
  const [sidePanel, setSidePanel] = useState<PanelId | null>(null);
  const [lastPanel, setLastPanel] = useState<PanelId>('ai');
  const [jobContext, setJobContext] = useState<EditorJobContext>({ jobTitle: '', company: '', jobDescription: '', jobUrl: '' });
  const [jobApplications, setJobApplications] = useState<JobApplication[]>([]);
  const [saving, setSaving] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [importingData, setImportingData] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const pdfImportRef = useRef<PDFImportHandle>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const loadedResumeIdRef = useRef<string | null>(null);

  const { leftWidthPct, aiWidthPx, draggingPanel, containerRef, startDrag } = usePanelResize();
  const { undoStack, redoStack, record, undo, redo } = useResumeHistory(localResume?.id ?? null);

  const persist = useCallback(async (resume: Resume) => {
    await saveResume(resume);
    whenIdle(() => { void scoreSnapshotDB.recordIfChanged(resume.id, runAtsCheck(resume)).catch(() => {}); });
  }, [saveResume]);

  const { schedule, flush, status: saveStatus, hasUnsaved } = useAutosave(persist, {
    onError: () => toast.error(t('app.autosave.failed'), { id: SAVE_ERROR_TOAST_ID }),
  });

  const refreshJobApplications = useCallback(async (resumeId: string) => {
    try {
      setJobApplications(await jobApplicationDB.getByResume(resumeId));
    } catch {
      setJobApplications([]);
    }
  }, []);

  // Switching resumes: save the one being left before loading the next.
  useEffect(() => {
    if (!id) return;
    void flush().then(() => loadResume(id));
  }, [id, loadResume, flush]);

  useEffect(() => {
    if (!currentResume || loadedResumeIdRef.current === currentResume.id) return;
    loadedResumeIdRef.current = currentResume.id;
    resumeRef.current = currentResume;
    setLocalResume(currentResume);
    setJobContext(context => ({ ...context, jobTitle: context.jobTitle || currentResume.targetJob || '' }));
    void refreshJobApplications(currentResume.id);
    whenIdle(() => { void scoreSnapshotDB.recordIfChanged(currentResume.id, runAtsCheck(currentResume)).catch(() => {}); });
  }, [currentResume, refreshJobApplications]);

  const applyResume = useCallback((next: Resume) => {
    resumeRef.current = next;
    setLocalResume(next);
    schedule(next);
  }, [schedule]);

  const handleResumeChange = useCallback((updated: Resume, options: ResumeChangeOptions = {}) => {
    const current = resumeRef.current;
    if (current && !options.skipHistory) {
      record(current, options.historyLabel ?? 'Edit', options.forceHistory);
    }
    applyResume(updated);
  }, [applyResume, record]);

  const handleManualSave = useCallback(async () => {
    const current = resumeRef.current;
    if (!current) return;
    setSaving(true);
    schedule(current);
    const ok = await flush();
    setSaving(false);
    if (ok) toast.success(t('editor.toast.saved'));
    else toast.error(t('editor.toast.saveFailed'), { id: SAVE_ERROR_TOAST_ID });
  }, [schedule, flush, t]);

  const handleUndo = useCallback(() => {
    const current = resumeRef.current;
    if (!current) return;
    const revision = undo(current);
    if (!revision) return;
    applyResume(revision.resume);
    toast.success(t('app.history.undid', { label: revision.label }));
  }, [applyResume, undo, t]);

  const handleRedo = useCallback(() => {
    const current = resumeRef.current;
    if (!current) return;
    const revision = redo(current);
    if (!revision) return;
    applyResume(revision.resume);
    toast.success(t('app.history.redid'));
  }, [applyResume, redo, t]);

  useEditorShortcuts({ save: handleManualSave, undo: handleUndo, redo: handleRedo });

  const handleExportAllData = useCallback(async () => {
    setExportingData(true);
    try {
      await flush();
      const count = await exportAllResumes();
      toast.success(t('app.data.exported', { count }));
    } catch {
      toast.error(t('app.data.exportFailed'));
    } finally {
      setExportingData(false);
    }
  }, [flush, t]);

  const handleImportData = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportingData(true);
    try {
      const result = await importResumeFile(file);
      if (result.kind === 'backup') {
        if (result.imported === 0) toast.error(t('app.data.nothingValid'));
        else toast.success([t('app.data.imported', { count: result.imported }), result.skipped ? t('app.data.skipped', { count: result.skipped }) : ''].join(' ').trim());
      } else if (result.kind === 'jsonResume') {
        toast.success(t('app.data.importedJsonResume'));
        router.push(`/editor?id=${encodeURIComponent(result.resume.id)}`);
      } else {
        toast.error(t('app.data.unrecognised'));
      }
    } catch (error) {
      toast.error(t('app.data.importFailed', { reason: describeValidationError(error) }));
    } finally {
      setImportingData(false);
    }
  }, [router, t]);

  const handleExportJsonResume = useCallback(() => {
    const current = resumeRef.current;
    if (!current) return;
    downloadJson(toJsonResume(current), `${(current.name || 'resume').replace(/[^\w.-]+/g, '-')}.jsonresume.json`);
    toast.success(t('app.data.exportedJsonResume'));
  }, [t]);

  const handleCreateJobVersion = useCallback(async () => {
    const current = resumeRef.current;
    if (!current) return;
    const role = jobContext.jobTitle.trim();
    const company = jobContext.company.trim();
    if (!role && !company) {
      toast.error(t('app.jobs.needRoleOrCompany'));
      return;
    }

    await flush();
    const now = new Date().toISOString();
    const applicationId = crypto.randomUUID();
    const versionResumeId = crypto.randomUUID();
    const baseResumeId = current.baseResumeId ?? current.id;
    const versionName = [company, role].filter(Boolean).join(' - ') || t('app.jobs.defaultVersionName');

    await resumeDB.createVersion(
      {
        ...structuredClone(current),
        id: versionResumeId,
        name: versionName,
        baseResumeId,
        jobApplicationId: applicationId,
        versionLabel: versionName,
        targetJob: role,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: applicationId,
        baseResumeId,
        versionResumeId,
        role,
        company,
        jobUrl: jobContext.jobUrl.trim() || undefined,
        jobDescription: jobContext.jobDescription.trim() || undefined,
        status: 'draft',
        exportHistory: [],
        createdAt: now,
        updatedAt: now,
      },
    );
    toast.success(t('app.jobs.versionCreated'));
    router.push(`/editor?id=${encodeURIComponent(versionResumeId)}`);
  }, [flush, jobContext, router, t]);

  const handleResumeExport = useCallback(async (filename: string) => {
    const current = resumeRef.current;
    if (!current?.jobApplicationId) return;
    await jobApplicationDB.addExport(current.jobApplicationId, {
      id: crypto.randomUUID(),
      exportedAt: new Date().toISOString(),
      filename,
      format: 'pdf',
    });
    await refreshJobApplications(current.id);
  }, [refreshJobApplications]);

  const handleApplySuggestion = useCallback((suggestion: OptimizationSuggestion) => {
    const current = resumeRef.current;
    if (!current) return;
    const updated = applySuggestion(current, suggestion);
    if (!updated) return;
    handleResumeChange(updated, { forceHistory: true, historyLabel: 'AI suggestion' });
    toast.success(t('editor.toast.suggestionApplied'));
  }, [handleResumeChange, t]);

  const handleSessionSaved = useCallback(async (session: OptimizationSession) => {
    await saveOptimization(session);
  }, [saveOptimization]);

  const handleApplyProofreadFixes = useCallback((fixes: { fieldKey: string; correctedText: string }[]) => {
    let updated = resumeRef.current;
    if (!updated) return 0;
    let applied = 0;
    for (const fix of fixes) {
      const next = applyFieldCorrection(updated, fix.fieldKey, fix.correctedText);
      if (next) {
        updated = next;
        applied += 1;
      }
    }
    if (applied > 0) handleResumeChange(updated, { forceHistory: true, historyLabel: 'Proofread fix' });
    return applied;
  }, [handleResumeChange]);

  const handleFillFromPDF = useCallback((parsed: Resume) => {
    const current = resumeRef.current;
    if (!current) return;
    handleResumeChange(
      { ...parsed, id: current.id, name: current.name, createdAt: current.createdAt },
      { forceHistory: true, historyLabel: 'PDF import' },
    );
    toast.success(t('editor.toast.filledFromPdf'));
  }, [handleResumeChange, t]);

  const handleJobContextChange = useCallback((updates: Partial<EditorJobContext>) => {
    setJobContext(context => ({ ...context, ...updates }));
  }, []);

  const openPanel = useCallback((panel: PanelId) => {
    setSidePanel(panel);
    setLastPanel(panel);
  }, []);

  const togglePanel = useCallback(() => {
    setSidePanel(current => (current ? null : lastPanel));
  }, [lastPanel]);

  if (!localResume) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
          <p className="text-sm">{t('editor.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => router.push('/app')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>

        {/* Resume name */}
        {editingName ? (
          <Input
            value={localResume.name}
            onChange={e => handleResumeChange({ ...localResume, name: e.target.value })}
            onBlur={() => setEditingName(false)}
            onKeyDown={e => e.key === 'Enter' && setEditingName(false)}
            autoFocus
            className="h-8 text-sm w-48"
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="font-semibold text-sm text-gray-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors truncate max-w-48"
          >
            {localResume.name}
          </button>
        )}

        {hasUnsaved && (
          <span className={`text-xs flex items-center gap-1 ml-1 ${saveStatus === 'error' ? 'text-red-500 dark:text-red-400' : 'text-amber-500 dark:text-amber-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${saveStatus === 'error' ? 'bg-red-500' : 'bg-amber-500 animate-pulse'}`} />
            {saveStatus === 'error' ? t('app.autosave.notSaved') : t('editor.unsaved')}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <PDFImport
            ref={pdfImportRef}
            onFill={handleFillFromPDF}
            label={t('editor.fillFromPdf')}
            hideTrigger
          />
          <input
            ref={importFileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImportData}
          />
          <HoverMenu
            align="right"
            triggerClassName="bg-transparent hover:bg-gray-100 dark:bg-transparent dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
            trigger={
              <>
                {importingData
                  ? <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  : <Upload className="w-3.5 h-3.5 text-emerald-500" />}
                {t('editor.import')}
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </>
            }
            items={[
              {
                label: t('editor.importFromPdf'),
                icon: <FileText className="w-3.5 h-3.5 text-emerald-500" />,
                onClick: () => pdfImportRef.current?.open(),
                title: t('app.importMenu.pdfTitle'),
              },
              {
                label: t('editor.importAllData'),
                icon: <Database className="w-3.5 h-3.5 text-amber-500" />,
                onClick: () => importFileRef.current?.click(),
                loading: importingData,
                title: t('app.importMenu.backupTitle'),
              },
              {
                label: t('editor.importJsonResume'),
                icon: <FileJson className="w-3.5 h-3.5 text-sky-500" />,
                onClick: () => importFileRef.current?.click(),
                loading: importingData,
                title: t('app.importMenu.jsonResumeTitle'),
              },
            ]}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            title={undoStack[0] ? t('app.history.undoLabel', { label: undoStack[0].label }) : t('app.history.undo')}
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            title={t('app.history.redo')}
          >
            <Redo2 className="w-4 h-4" />
          </Button>
          <Button
            variant={sidePanel ? 'secondary' : 'ghost'}
            size="sm"
            onClick={togglePanel}
            className="gap-1.5"
            title={t('app.tools.title')}
          >
            <PanelRight className="w-3.5 h-3.5 text-emerald-500" />
            {sidePanel ? t('app.tools.hide') : t('app.tools.show')}
          </Button>
          <Button
            size="sm"
            loading={saving}
            onClick={handleManualSave}
            variant={hasUnsaved ? 'primary' : 'secondary'}
          >
            <Save className="w-3.5 h-3.5" />
            {t('editor.save')}
          </Button>
        </div>
      </div>

      {/* Main layout */}
      <div ref={containerRef} className={`flex flex-1 overflow-hidden${draggingPanel ? ' select-none cursor-col-resize' : ''}`}>
        {/* Left: Editor */}
        <div style={{ width: `${leftWidthPct}%` }} className="overflow-y-auto shrink-0">
          <div className="mx-auto px-4 py-6">
            <ResumeEditor resume={localResume} onChange={handleResumeChange} jobContext={jobContext} />
          </div>
        </div>

        <DragDivider onMouseDown={startDrag('left')} active={draggingPanel === 'left'} />

        {/* Center: Preview */}
        <div className="flex-1 overflow-y-auto min-w-0 bg-gray-50 dark:bg-gray-900">
          <ResumePreview
            resume={localResume}
            onChange={handleResumeChange}
            onExport={handleResumeExport}
            onExportData={handleExportAllData}
            onExportJsonResume={handleExportJsonResume}
            exportingData={exportingData}
          />
        </div>

        {/* Side Panel */}
        {sidePanel && (
          <>
            <DragDivider onMouseDown={startDrag('ai')} active={draggingPanel === 'ai'} />
            <SidePanel
              width={aiWidthPx}
              sidePanel={sidePanel}
              onSelectPanel={openPanel}
              resume={localResume}
              jobContext={jobContext}
              onJobContextChange={handleJobContextChange}
              applications={jobApplications}
              onApplySuggestion={handleApplySuggestion}
              onSessionSaved={handleSessionSaved}
              onCreateVersion={handleCreateJobVersion}
              onRefreshJobs={() => refreshJobApplications(localResume.id)}
              onOpenResume={resumeId => router.push(`/editor?id=${encodeURIComponent(resumeId)}`)}
              onApplyProofreadFixes={handleApplyProofreadFixes}
            />
          </>
        )}
      </div>
    </div>
  );
}
