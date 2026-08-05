import { useState } from 'react';
import { Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../../../lib/utils';
import RichTextEditor from '../RichText';
import { richTextToPlainText } from '../../../lib/richText';
import { useSettingsStore } from '../../../store/settingsStore';
import { improveSection } from '../../../services/ai/aiService';
import type { InlineAIAction, InlineAIContext } from './types';

export function AIRichTextEditor({
  sectionType,
  value,
  onChange,
  onApply,
  aiContext,
  actions,
  label,
  placeholder,
  minHeight,
  className,
  toolsClassName,
}: {
  sectionType: string;
  value: string;
  onChange: (value: string) => void;
  onApply: (value: string) => void;
  aiContext: InlineAIContext;
  actions: InlineAIAction[];
  label?: string;
  placeholder?: string;
  minHeight?: number;
  className?: string;
  toolsClassName?: string;
}) {
  return (
    <>
      <RichTextEditor
        label={label}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        minHeight={minHeight}
        className={className}
      />
      <InlineAITools
        sectionType={sectionType}
        value={value}
        onApply={onApply}
        aiContext={aiContext}
        actions={actions}
        className={toolsClassName}
      />
    </>
  );
}

export function InlineAITools({
  sectionType,
  value,
  onApply,
  aiContext,
  actions,
  compact = false,
  className,
}: {
  sectionType: string;
  value: string;
  onApply: (value: string) => void;
  aiContext: InlineAIContext;
  actions: InlineAIAction[];
  compact?: boolean;
  className?: string;
}) {
  const { getActiveConfig, aiSettings } = useSettingsStore();
  const [loadingAction, setLoadingAction] = useState<InlineAIAction | null>(null);

  const actionLabels: Record<InlineAIAction, string> = {
    rewrite: 'Rewrite',
    concise: 'Concise',
    metrics: 'Add metrics',
    tailor: 'Tailor',
    grammar: 'Grammar',
  };

  const instructions: Record<InlineAIAction, string> = {
    rewrite: 'Rewrite this as polished, ATS-friendly resume content. Use strong action verbs, improve clarity and impact, and preserve all facts.',
    concise: 'Shorten this while keeping the strongest achievements, role-specific keywords, and measurable context. Remove filler and repetition.',
    metrics: 'Add bracketed metric prompts only where evidence is missing, such as [X%], [team size], or [$ amount]. Do not invent numbers or outcomes.',
    tailor: 'Adapt this to the job description by emphasizing relevant skills, keywords, and responsibilities. Preserve truthfulness and do not add unsupported experience.',
    grammar: 'Correct grammar, spelling, punctuation, tense, and awkward phrasing. Keep the original meaning, facts, and resume tone.',
  };

  const handleAction = async (action: InlineAIAction) => {
    const config = getActiveConfig();
    const currentContent = richTextToPlainText(value);
    if (!config) {
      toast.error(`No API key configured for ${aiSettings.activeProvider}.`);
      return;
    }
    if (!currentContent.trim()) {
      toast.error('Add content before using AI tools.');
      return;
    }
    if (action === 'tailor' && !aiContext.jobDescription.trim()) {
      toast.error('Add a job description in AI Optimize, Cover Letter, or Job Versions first.');
      return;
    }

    setLoadingAction(action);
    try {
      const improved = await improveSection(
        config.provider,
        config.apiKey,
        config.model,
        sectionType,
        currentContent,
        aiContext.jobDescription,
        instructions[action],
      );
      onApply(improved.trim());
      toast.success(`${actionLabels[action]} applied`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'AI action failed');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className={cn('flex flex-wrap gap-1.5', compact ? 'items-center shrink-0 max-w-[118px]' : 'mt-2', className)}>
      {actions.map(action => (
        <button
          key={action}
          type="button"
          onClick={() => handleAction(action)}
          disabled={loadingAction !== null}
          className={cn(
            'inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 transition-colors',
            'hover:bg-emerald-100 disabled:pointer-events-none disabled:opacity-50',
            'dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300 dark:hover:bg-emerald-900/30',
            compact && 'px-1.5'
          )}
          title={actionLabels[action]}
        >
          {loadingAction === action ? (
            <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
          ) : (
            <Wand2 className="w-3 h-3" />
          )}
          {!compact && actionLabels[action]}
        </button>
      ))}
    </div>
  );
}
