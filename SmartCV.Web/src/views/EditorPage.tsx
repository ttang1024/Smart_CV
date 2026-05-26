'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Briefcase, FileSearch, FileText, MessageSquareText, Redo2, Save, Sparkles, Undo2, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useResumeStore } from '../store/resumeStore';
import type { Resume } from '../types/resume';
import type { OptimizationSession, OptimizationSuggestion } from '../types/ai';
import ResumeEditor from '../components/resume/ResumeEditor';
import ResumePreview from '../components/resume/ResumePreview';
import AIOptimizationPanel from '../components/ai/AIOptimizationPanel';
import ATSCheckerPanel from '../components/ats/ATSCheckerPanel';
import CoverLetterPanel from '../components/cover/CoverLetterPanel';
import InterviewPrepPanel from '../components/interview/InterviewPrepPanel';
import JobVersionsPanel from '../components/jobs/JobVersionsPanel';
import PDFImport from '../components/resume/PDFImport';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { richTextToPlainText } from '../lib/richText';
import { revisionHistory, type ResumeRevision } from '../services/storage/revisionHistory';
import { jobApplicationDB } from '../services/storage/jobApplications';
import { resumeDB } from '../services/storage/indexedDB';
import type { JobApplication } from '../types/jobApplication';
import toast from 'react-hot-toast';

function DragDivider({ onMouseDown, active }: { onMouseDown: (e: React.MouseEvent) => void; active: boolean }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className={`relative w-1 shrink-0 cursor-col-resize group select-none transition-colors
        ${active ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-800 hover:bg-emerald-400 dark:hover:bg-emerald-600'}`}
    >
      <div className="absolute inset-y-0 -left-1 -right-1" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-0.5">
        {[0, 1, 2].map(i => (
          <div key={i} className={`w-1 h-1 rounded-full transition-colors
            ${active ? 'bg-white' : 'bg-gray-400 dark:bg-gray-600 group-hover:bg-emerald-300'}`} />
        ))}
      </div>
    </div>
  );
}

interface ResumeChangeOptions {
  historyLabel?: string;
  forceHistory?: boolean;
  skipHistory?: boolean;
}

const HISTORY_COALESCE_MS = 1200;

export default function EditorPage() {
  const searchParams = useSearchParams();
  const id = searchParams?.get('id');
  const router = useRouter();
  const { t } = useTranslation();
  const { currentResume, loadResume, saveResume, saveOptimization } = useResumeStore();
  const [localResume, setLocalResume] = useState<Resume | null>(null);
  const [sidePanel, setSidePanel] = useState<'ai' | 'ats' | 'cover' | 'interview' | 'jobs' | null>(null);
  const [jobContext, setJobContext] = useState({ jobTitle: '', company: '', jobDescription: '', jobUrl: '' });
  const [jobApplications, setJobApplications] = useState<JobApplication[]>([]);
  const [saving, setSaving] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [importingData, setImportingData] = useState(false);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [editingName, setEditingName] = useState(false);
  const [undoStack, setUndoStack] = useState<ResumeRevision[]>([]);
  const [redoStack, setRedoStack] = useState<ResumeRevision[]>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const lastHistoryPushRef = useRef(0);
  const loadedResumeIdRef = useRef<string | null>(null);

  // Panel resize state
  const [leftWidthPct, setLeftWidthPct] = useState(40);
  const [aiWidthPx, setAiWidthPx] = useState(384);
  const [draggingPanel, setDraggingPanel] = useState<'left' | 'ai' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<'left' | 'ai' | null>(null);
  const dragStartX = useRef(0);
  const dragStartValue = useRef(0);

  const startDrag = useCallback((panel: 'left' | 'ai') => (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = panel;
    setDraggingPanel(panel);
    dragStartX.current = e.clientX;
    dragStartValue.current = panel === 'left' ? leftWidthPct : aiWidthPx;
  }, [leftWidthPct, aiWidthPx]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const containerWidth = containerRef.current.getBoundingClientRect().width;
      const delta = e.clientX - dragStartX.current;
      if (dragging.current === 'left') {
        const deltaPct = (delta / containerWidth) * 100;
        setLeftWidthPct(Math.max(20, Math.min(60, dragStartValue.current + deltaPct)));
      } else {
        setAiWidthPx(Math.max(280, Math.min(640, dragStartValue.current - delta)));
      }
    };
    const onMouseUp = () => {
      dragging.current = null;
      setDraggingPanel(null);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  useEffect(() => {
    if (id) loadResume(id);
  }, [id, loadResume]);

  const refreshJobApplications = useCallback((resumeId?: string) => {
    const targetId = resumeId ?? localResume?.id;
    if (!targetId) return;
    setJobApplications(jobApplicationDB.getByResume(targetId));
  }, [localResume?.id]);

  useEffect(() => {
    if (currentResume) {
      if (loadedResumeIdRef.current === currentResume.id) return;
      loadedResumeIdRef.current = currentResume.id;
      setLocalResume(currentResume);
      setUndoStack(revisionHistory.get(currentResume.id));
      setRedoStack([]);
      lastHistoryPushRef.current = 0;
      setJobContext(context => ({
        ...context,
        jobTitle: context.jobTitle || currentResume.targetJob || '',
      }));
      refreshJobApplications(currentResume.id);
    }
  }, [currentResume, refreshJobApplications]);

  // Autosave with debounce
  const scheduleSave = useCallback((updated: Resume) => {
    setLocalResume(updated);
    setHasUnsaved(true);

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await saveResume(updated);
        setHasUnsaved(false);
      } catch {
        // Silent autosave failure
      }
    }, 1500);
  }, [saveResume]);

  // Autosave with debounce and bounded local revision history
  const handleResumeChange = useCallback((updated: Resume, options: ResumeChangeOptions = {}) => {
    setLocalResume(current => {
      if (!current || options.skipHistory) return updated;

      const now = Date.now();
      const shouldPush =
        options.forceHistory ||
        redoStack.length > 0 ||
        undoStack.length === 0 ||
        now - lastHistoryPushRef.current > HISTORY_COALESCE_MS;

      if (shouldPush) {
        const nextHistory = revisionHistory.push(current, options.historyLabel ?? 'Edit', undoStack);
        setUndoStack(nextHistory);
        setRedoStack([]);
        lastHistoryPushRef.current = now;
      }

      return updated;
    });
    scheduleSave(updated);
  }, [redoStack.length, scheduleSave, undoStack]);

  const handleManualSave = useCallback(async () => {
    if (!localResume) return;
    setSaving(true);
    try {
      await saveResume(localResume);
      setHasUnsaved(false);
      toast.success(t('editor.toast.saved'));
    } catch {
      toast.error(t('editor.toast.saveFailed'));
    } finally {
      setSaving(false);
    }
  }, [localResume, saveResume, t]);

  const handleExportIndexedDBData = useCallback(async () => {
    setExportingData(true);
    try {
      if (localResume && hasUnsaved) {
        await saveResume(localResume);
        setHasUnsaved(false);
      }

      const resumes = await resumeDB.getAll();
      const exportedAt = new Date().toISOString();
      const payload = {
        app: 'SmartCV',
        schemaVersion: 1,
        exportedAt,
        source: 'indexeddb',
        resumes,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smartcv-indexeddb-resumes-${exportedAt.slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${resumes.length} resume${resumes.length === 1 ? '' : 's'}`);
    } catch {
      toast.error('Failed to export IndexedDB resume data');
    } finally {
      setExportingData(false);
    }
  }, [hasUnsaved, localResume, saveResume]);

  const handleImportData = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImportingData(true);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      if (payload.app !== 'SmartCV' || !Array.isArray(payload.resumes)) {
        toast.error('Invalid SmartCV export file');
        return;
      }
      const resumes: Resume[] = payload.resumes;
      await Promise.all(resumes.map(r => resumeDB.save(r)));
      toast.success(`Imported ${resumes.length} resume${resumes.length === 1 ? '' : 's'}`);
    } catch {
      toast.error('Failed to import data');
    } finally {
      setImportingData(false);
    }
  }, []);

  const handleUndo = useCallback(() => {
    if (!localResume || undoStack.length === 0) return;

    const [revision, ...remaining] = undoStack;
    const redoRevision: ResumeRevision = {
      id: crypto.randomUUID(),
      resumeId: localResume.id,
      label: 'Redo point',
      createdAt: new Date().toISOString(),
      resume: JSON.parse(JSON.stringify(localResume)) as Resume,
    };
    setUndoStack(revisionHistory.replace(localResume.id, remaining));
    setRedoStack(stack => [redoRevision, ...stack].slice(0, 30));
    lastHistoryPushRef.current = Date.now();
    scheduleSave(revision.resume);
    toast.success(`Undid: ${revision.label}`);
  }, [localResume, undoStack, scheduleSave]);

  const handleRedo = useCallback(() => {
    if (!localResume || redoStack.length === 0) return;

    const [revision, ...remaining] = redoStack;
    const nextUndo = revisionHistory.push(localResume, 'Undo point', undoStack);
    setUndoStack(nextUndo);
    setRedoStack(remaining);
    lastHistoryPushRef.current = Date.now();
    scheduleSave(revision.resume);
    toast.success('Redid change');
  }, [localResume, redoStack, scheduleSave, undoStack]);

  const handleCreateJobVersion = useCallback(async () => {
    if (!localResume) return;
    const role = jobContext.jobTitle.trim();
    const company = jobContext.company.trim();
    if (!role && !company) {
      toast.error('Add a role or company first.');
      return;
    }

    const now = new Date().toISOString();
    const applicationId = crypto.randomUUID();
    const versionResumeId = crypto.randomUUID();
    const baseResumeId = localResume.baseResumeId ?? localResume.id;
    const versionName = [company, role].filter(Boolean).join(' - ') || 'Job-specific Resume';
    const version: Resume = {
      ...JSON.parse(JSON.stringify(localResume)) as Resume,
      id: versionResumeId,
      name: versionName,
      baseResumeId,
      jobApplicationId: applicationId,
      versionLabel: versionName,
      targetJob: role,
      createdAt: now,
      updatedAt: now,
    };
    const application: JobApplication = {
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
    };

    await resumeDB.save(version);
    jobApplicationDB.save(application);
    toast.success('Job-specific resume version created');
    router.push(`/editor?id=${encodeURIComponent(versionResumeId)}`);
  }, [jobContext, localResume, router]);

  const handleResumeExport = useCallback((filename: string) => {
    if (!localResume?.jobApplicationId) return;
    jobApplicationDB.addExport(localResume.jobApplicationId, {
      id: crypto.randomUUID(),
      exportedAt: new Date().toISOString(),
      filename,
      format: 'pdf',
    });
    refreshJobApplications(localResume.id);
  }, [localResume, refreshJobApplications]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleManualSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleManualSave, handleUndo, handleRedo]);

  const handleApplySuggestion = useCallback((suggestion: OptimizationSuggestion) => {
    if (!localResume || !suggestion.improvedText) return;

    let updated = { ...localResume };
    let applied = false;

    switch (suggestion.type) {
      case 'summary':
        updated = { ...updated, summary: suggestion.improvedText };
        applied = true;
        break;
      case 'experience': {
        if (suggestion.originalText) {
          const newExperience = updated.experience.map(exp => {
            if (richTextToPlainText(exp.description).includes(suggestion.originalText!)) {
              return { ...exp, description: suggestion.improvedText! };
            }
            const updatedHighlights = exp.highlights.map(h =>
              richTextToPlainText(h).includes(suggestion.originalText!) ? suggestion.improvedText! : h
            );
            if (updatedHighlights.some((h, i) => h !== exp.highlights[i])) {
              return { ...exp, highlights: updatedHighlights };
            }
            return exp;
          });
          if (newExperience.some((e, i) => e !== updated.experience[i])) {
            updated = { ...updated, experience: newExperience };
            applied = true;
          }
        }
        break;
      }
      case 'skills': {
        if (suggestion.originalText) {
          const newSkills = updated.skills.map(skill => {
            const skillText = skill.items.join(', ');
            const categoryPrefix = skill.category ? `${skill.category}:` : null;
            const isMatch =
              skillText === suggestion.originalText ||
              (categoryPrefix !== null && suggestion.originalText!.startsWith(categoryPrefix));
            if (isMatch) {
              let improvedContent = suggestion.improvedText!;
              if (categoryPrefix && improvedContent.startsWith(categoryPrefix)) {
                improvedContent = improvedContent.slice(categoryPrefix.length).trim();
              }
              const newItems = improvedContent
                .split(',')
                .map(s => s.trim())
                .filter(Boolean);
              return { ...skill, items: newItems };
            }
            return skill;
          });
          if (newSkills.some((s, i) => s !== updated.skills[i])) {
            updated = { ...updated, skills: newSkills };
            applied = true;
          }
        }
        break;
      }
      default:
        break;
    }

    if (applied) {
      handleResumeChange(updated, { forceHistory: true, historyLabel: 'AI suggestion' });
      toast.success(t('editor.toast.suggestionApplied'));
    }
  }, [localResume, handleResumeChange, t]);

  const handleSessionSaved = useCallback(async (session: OptimizationSession) => {
    await saveOptimization(session);
  }, [saveOptimization]);

  const handleFillFromPDF = useCallback((parsed: Resume) => {
    if (!localResume) return;
    handleResumeChange({
      ...parsed,
      id: localResume.id,
      name: localResume.name,
      createdAt: localResume.createdAt,
    }, { forceHistory: true, historyLabel: 'PDF import' });
    toast.success(t('editor.toast.filledFromPdf'));
  }, [localResume, handleResumeChange, t]);

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
          <span className="text-xs text-amber-500 dark:text-amber-400 flex items-center gap-1 ml-1">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
            {t('editor.unsaved')}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <PDFImport onFill={handleFillFromPDF} label={t('editor.fillFromPdf')} />
          <input
            ref={importFileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImportData}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => importFileRef.current?.click()}
            loading={importingData}
            className="gap-1.5"
            title="Import resume data from a SmartCV export file"
          >
            {!importingData && <Upload className="w-3.5 h-3.5 text-emerald-500" />}
            Import Data
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            title={undoStack[0] ? `Undo ${undoStack[0].label}` : 'Undo'}
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidePanel(panel => panel === 'jobs' ? null : 'jobs')}
            className="gap-1.5"
          >
            <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
            {sidePanel === 'jobs' ? 'Hide Jobs' : 'Job Versions'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidePanel(panel => panel === 'ats' ? null : 'ats')}
            className="gap-1.5"
          >
            <FileSearch className="w-3.5 h-3.5 text-teal-500" />
            {sidePanel === 'ats' ? 'Hide ATS' : 'ATS Check'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidePanel(panel => panel === 'cover' ? null : 'cover')}
            className="gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-sky-500" />
            {sidePanel === 'cover' ? 'Hide Letter' : 'Cover Letter'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidePanel(panel => panel === 'interview' ? null : 'interview')}
            className="gap-1.5"
          >
            <MessageSquareText className="w-3.5 h-3.5 text-violet-500" />
            {sidePanel === 'interview' ? 'Hide Interview' : 'Interview Prep'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidePanel(panel => panel === 'ai' ? null : 'ai')}
            className="gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            {sidePanel === 'ai' ? t('editor.hideAI') : t('editor.aiOptimize')}
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
            onExportData={handleExportIndexedDBData}
            exportingData={exportingData}
          />
        </div>

        {/* Side Panel */}
        {sidePanel && (
          <>
            <DragDivider onMouseDown={startDrag('ai')} active={draggingPanel === 'ai'} />
            <div style={{ width: `${aiWidthPx}px` }} className="bg-white dark:bg-gray-950 flex flex-col overflow-hidden shrink-0">
              {sidePanel === 'ai' ? (
                <AIOptimizationPanel
                  resume={localResume}
                  onApplySuggestion={handleApplySuggestion}
                  onSessionSaved={handleSessionSaved}
                  jobContext={jobContext}
                  onJobContextChange={updates => setJobContext(context => ({ ...context, ...updates }))}
                />
              ) : sidePanel === 'cover' ? (
                <CoverLetterPanel
                  resume={localResume}
                  jobContext={jobContext}
                  onJobContextChange={updates => setJobContext(context => ({ ...context, ...updates }))}
                />
              ) : sidePanel === 'interview' ? (
                <InterviewPrepPanel
                  resume={localResume}
                  jobContext={jobContext}
                  onJobContextChange={updates => setJobContext(context => ({ ...context, ...updates }))}
                />
              ) : sidePanel === 'jobs' ? (
                <JobVersionsPanel
                  resume={localResume}
                  applications={jobApplications}
                  jobContext={jobContext}
                  onJobContextChange={updates => setJobContext(context => ({ ...context, ...updates }))}
                  onCreateVersion={handleCreateJobVersion}
                  onRefresh={() => refreshJobApplications(localResume.id)}
                  onOpenResume={resumeId => router.push(`/editor?id=${encodeURIComponent(resumeId)}`)}
                />
              ) : (
                <ATSCheckerPanel resume={localResume} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
