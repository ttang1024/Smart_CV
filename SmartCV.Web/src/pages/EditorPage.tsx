import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useResumeStore } from '../store/resumeStore';
import type { Resume } from '../types/resume';
import type { OptimizationSession, OptimizationSuggestion } from '../types/ai';
import ResumeEditor from '../components/resume/ResumeEditor';
import ResumePreview from '../components/resume/ResumePreview';
import AIOptimizationPanel from '../components/ai/AIOptimizationPanel';
import PDFImport from '../components/resume/PDFImport';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
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

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentResume, loadResume, saveResume, saveOptimization } = useResumeStore();
  const [localResume, setLocalResume] = useState<Resume | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

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
  }, [id]);

  useEffect(() => {
    if (currentResume) setLocalResume(currentResume);
  }, [currentResume]);

  // Autosave with debounce
  const handleResumeChange = useCallback((updated: Resume) => {
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

  const handleManualSave = useCallback(async () => {
    if (!localResume) return;
    setSaving(true);
    try {
      await saveResume(localResume);
      setHasUnsaved(false);
      toast.success(t('editor.toast.saved'));
    } catch (e) {
      toast.error(t('editor.toast.saveFailed'));
    } finally {
      setSaving(false);
    }
  }, [localResume, saveResume]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleManualSave();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleManualSave]);

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
            if (exp.description.includes(suggestion.originalText!)) {
              return { ...exp, description: suggestion.improvedText! };
            }
            const updatedHighlights = exp.highlights.map(h =>
              h.includes(suggestion.originalText!) ? suggestion.improvedText! : h
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
      handleResumeChange(updated);
      toast.success(t('editor.toast.suggestionApplied'));
    }
  }, [localResume, handleResumeChange]);

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
    });
    toast.success(t('editor.toast.filledFromPdf'));
  }, [localResume, handleResumeChange]);

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
        <Button variant="ghost" size="icon" onClick={() => navigate('/app')}>
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAI(v => !v)}
            className="gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            {showAI ? t('editor.hideAI') : t('editor.aiOptimize')}
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
            <ResumeEditor resume={localResume} onChange={handleResumeChange} />
          </div>
        </div>

        <DragDivider onMouseDown={startDrag('left')} active={draggingPanel === 'left'} />

        {/* Center: Preview */}
        <div className="flex-1 overflow-y-auto min-w-0 bg-gray-50 dark:bg-gray-900">
          <ResumePreview resume={localResume} onChange={handleResumeChange} />
        </div>

        {/* AI Panel */}
        {showAI && (
          <>
            <DragDivider onMouseDown={startDrag('ai')} active={draggingPanel === 'ai'} />
            <div style={{ width: `${aiWidthPx}px` }} className="bg-white dark:bg-gray-950 flex flex-col overflow-hidden shrink-0">
              <AIOptimizationPanel
                resume={localResume}
                onApplySuggestion={handleApplySuggestion}
                onSessionSaved={handleSessionSaved}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
