import { AlertCircle, Check, CheckCheck, SpellCheck, Sparkles } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import type { Resume } from '../../types/resume';
import type { ProofreadIssue, ProofreadSeverity } from '../../services/ai/proofreader';
import { proofreadResume } from '../../services/ai/proofreader';
import { richTextToPlainText } from '../../lib/richText';
import { useSettingsStore } from '../../store/settingsStore';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

interface ProofreadPanelProps {
  resume: Resume;
  /** Applies fixes to the resume; returns how many were actually applied. */
  onApplyFixes: (fixes: { fieldKey: string; correctedText: string }[]) => number;
}

const SEVERITY_STYLES: Record<ProofreadSeverity, string> = {
  error: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  suggestion: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
};

export default function ProofreadPanel({ resume, onApplyFixes }: ProofreadPanelProps) {
  const { getActiveConfig, aiSettings } = useSettingsStore();
  const [issues, setIssues] = useState<ProofreadIssue[] | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeProvider = aiSettings.activeProvider;
  const config = getActiveConfig();

  const handleRun = async () => {
    if (!config) {
      setError(`No API key configured for ${activeProvider}. Go to Settings.`);
      return;
    }

    setLoading(true);
    setError(null);
    setIssues(null);
    setAppliedIds(new Set());
    try {
      setIssues(await proofreadResume(config.provider, config.apiKey, config.model, resume));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Proofreading failed');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (issue: ProofreadIssue) => {
    const applied = onApplyFixes([{ fieldKey: issue.fieldKey, correctedText: issue.correctedText }]);
    if (applied > 0) {
      setAppliedIds(prev => new Set(prev).add(issue.id));
    } else {
      toast.error('Could not apply — the text may have changed since the check ran.');
    }
  };

  const handleApplyAll = () => {
    const pending = (issues ?? []).filter(issue => !appliedIds.has(issue.id));
    if (pending.length === 0) return;
    const applied = onApplyFixes(pending.map(issue => ({
      fieldKey: issue.fieldKey,
      correctedText: issue.correctedText,
    })));
    if (applied > 0) {
      setAppliedIds(prev => {
        const next = new Set(prev);
        pending.forEach(issue => next.add(issue.id));
        return next;
      });
      toast.success(`Applied ${applied} ${applied === 1 ? 'fix' : 'fixes'}`);
    } else {
      toast.error('Could not apply — the text may have changed since the check ran.');
    }
  };

  const pendingCount = (issues ?? []).filter(issue => !appliedIds.has(issue.id)).length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-fuchsia-50 to-purple-50 dark:from-fuchsia-950/30 dark:to-purple-950/30">
        <div className="flex items-center gap-2">
          <SpellCheck className="w-4 h-4 text-fuchsia-600 dark:text-fuchsia-400" />
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Proofread</h2>
          <Badge variant="info" className="ml-auto">{activeProvider.toUpperCase()}</Badge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            AI checks spelling, grammar, punctuation, consistency (tense, capitalization, date style),
            and clarity — without rewriting your content. Apply fixes one by one or all at once.
          </p>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="break-words min-w-0">{error}</span>
            </div>
          )}

          <Button className="w-full" loading={loading} onClick={handleRun}>
            <Sparkles className="w-4 h-4" />
            {loading ? 'Checking...' : issues ? 'Check Again' : 'Proofread Resume'}
          </Button>

          {issues && issues.length === 0 && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-lg text-sm">
              <Check className="w-4 h-4 shrink-0" />
              No issues found — your resume reads clean.
            </div>
          )}

          {issues && issues.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  {issues.length} {issues.length === 1 ? 'issue' : 'issues'} found
                </p>
                {pendingCount > 0 && (
                  <Button variant="secondary" size="sm" onClick={handleApplyAll}>
                    <CheckCheck className="w-3.5 h-3.5" />
                    Apply All ({pendingCount})
                  </Button>
                )}
              </div>

              {issues.map(issue => {
                const applied = appliedIds.has(issue.id);
                return (
                  <div
                    key={issue.id}
                    className={`p-3 rounded-lg border space-y-2 ${
                      applied
                        ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${SEVERITY_STYLES[issue.severity]}`}>
                        {issue.severity}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                        {issue.category}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate ml-auto">
                        {issue.fieldLabel}
                      </span>
                    </div>
                    {issue.explanation && (
                      <p className="text-xs text-gray-600 dark:text-gray-300">{issue.explanation}</p>
                    )}
                    <div className="text-xs space-y-1">
                      <p className="text-red-600/80 dark:text-red-400/80 line-through break-words">
                        {richTextToPlainText(issue.originalText)}
                      </p>
                      <p className="text-emerald-700 dark:text-emerald-300 break-words">
                        {richTextToPlainText(issue.correctedText)}
                      </p>
                    </div>
                    {applied ? (
                      <p className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        <Check className="w-3.5 h-3.5" /> Applied
                      </p>
                    ) : (
                      <Button variant="secondary" size="sm" onClick={() => handleApply(issue)}>
                        <Check className="w-3.5 h-3.5" />
                        Apply Fix
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
