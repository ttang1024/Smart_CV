import { useMemo, useState } from 'react';
import { Sparkles, AlertCircle, ChevronRight, Check, Lightbulb, Target, Search, Tag, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { Resume } from '../../types/resume';
import type { OptimizationResult, OptimizationSession, OptimizationSuggestion } from '../../types/ai';
import { useSettingsStore } from '../../store/settingsStore';
import { optimizeResume } from '../../services/ai/aiService';
import { runAtsCheck } from '../../services/ats/atsChecker';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import ScoreRing from '../ui/ScoreRing';

interface AIOptimizationPanelProps {
  resume: Resume;
  onApplySuggestion: (suggestion: OptimizationSuggestion) => void;
  onSessionSaved: (session: OptimizationSession) => void;
  jobContext?: {
    jobTitle: string;
    company: string;
    jobDescription: string;
  };
  onJobContextChange?: (updates: Partial<{ jobTitle: string; company: string; jobDescription: string }>) => void;
}

export default function AIOptimizationPanel({ resume, onApplySuggestion, onSessionSaved, jobContext, onJobContextChange }: AIOptimizationPanelProps) {
  const { getActiveConfig, aiSettings } = useSettingsStore();
  const { t } = useTranslation();
  const [jobDescription, setJobDescriptionState] = useState(jobContext?.jobDescription ?? '');
  const [jobTitle, setJobTitleState] = useState(jobContext?.jobTitle ?? '');
  const [company, setCompanyState] = useState(jobContext?.company ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OptimizationResult | null>(null);

  const activeProvider = aiSettings.activeProvider;
  const config = getActiveConfig();

  // Live client-side ATS readiness — recomputes as the resume is edited, so the
  // user can watch the score move as they apply optimization suggestions.
  // Full class strings (no runtime interpolation) so Tailwind keeps them.
  const ats = useMemo(() => runAtsCheck(resume), [resume]);
  const atsStyle =
    ats.score >= 85 ? { icon: 'text-emerald-500', bar: 'bg-emerald-500' } :
    ats.score >= 70 ? { icon: 'text-sky-500', bar: 'bg-sky-500' } :
    ats.score >= 50 ? { icon: 'text-amber-500', bar: 'bg-amber-500' } :
    { icon: 'text-red-500', bar: 'bg-red-500' };

  const setJobTitle = (value: string) => {
    setJobTitleState(value);
    onJobContextChange?.({ jobTitle: value });
  };

  const setCompany = (value: string) => {
    setCompanyState(value);
    onJobContextChange?.({ company: value });
  };

  const setJobDescription = (value: string) => {
    setJobDescriptionState(value);
    onJobContextChange?.({ jobDescription: value });
  };

  const handleOptimize = async () => {
    if (!config) {
      setError(t('aiPanel.noApiKey', { provider: activeProvider }));
      return;
    }
    if (!jobDescription.trim()) {
      setError(t('aiPanel.noJobDesc'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fullJobDesc = [
        jobTitle && `Position: ${jobTitle}`,
        company && `Company: ${company}`,
        jobDescription
      ].filter(Boolean).join('\n\n');

      const optimizationResult = await optimizeResume(
        config.provider,
        config.apiKey,
        config.model,
        resume,
        fullJobDesc
      );

      setResult(optimizationResult);

      // Save to store
      const session: OptimizationSession = {
        id: crypto.randomUUID(),
        resumeId: resume.id,
        jobDescription: fullJobDesc,
        jobTitle: jobTitle || undefined,
        company: company || undefined,
        result: optimizationResult,
        createdAt: new Date().toISOString()
      };
      onSessionSaved(session);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Optimization failed');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (suggestion: OptimizationSuggestion) => {
    onApplySuggestion(suggestion);
    if (result) {
      setResult({
        ...result,
        suggestions: result.suggestions.map(s =>
          s.id === suggestion.id ? { ...s, applied: true } : s
        )
      });
    }
  };

  const priorityBadge = (priority: 'high' | 'medium' | 'low') => {
    const map = { high: 'danger' as const, medium: 'warning' as const, low: 'info' as const };
    return <Badge variant={map[priority]}>{priority}</Badge>;
  };

  const typeIcon = (type: OptimizationSuggestion['type']) => {
    const map: Record<string, React.ReactNode> = {
      summary: <Lightbulb className="w-3.5 h-3.5" />,
      experience: <Target className="w-3.5 h-3.5" />,
      skills: <Tag className="w-3.5 h-3.5" />,
      keywords: <Search className="w-3.5 h-3.5" />,
      general: <ChevronRight className="w-3.5 h-3.5" />
    };
    return map[type] ?? map.general;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">{t('aiPanel.title')}</h2>
          <Badge variant="purple" className="ml-auto">{activeProvider.toUpperCase()}</Badge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Job input */}
        <div className="p-4 space-y-3 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder={t('aiPanel.jobTitle')}
              value={jobTitle}
              onChange={e => setJobTitle(e.target.value)}
            />
            <Input
              placeholder={t('aiPanel.company')}
              value={company}
              onChange={e => setCompany(e.target.value)}
            />
          </div>
          <Textarea
            placeholder={t('aiPanel.jobDescriptionPlaceholder')}
            value={jobDescription}
            onChange={e => setJobDescription(e.target.value)}
            rows={6}
          />

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="break-words min-w-0">{error}</span>
            </div>
          )}

          {/* Live ATS readiness — moves as suggestions are applied */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-2.5">
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldCheck className={`w-3.5 h-3.5 ${atsStyle.icon}`} />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">ATS readiness</span>
              <span className="ml-auto text-xs font-semibold text-gray-900 dark:text-white">{ats.score}/100 · {ats.verdict}</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div className={`h-full rounded-full ${atsStyle.bar} transition-all duration-500`} style={{ width: `${ats.score}%` }} />
            </div>
          </div>

          <Button
            className="w-full"
            loading={loading}
            onClick={handleOptimize}
            disabled={!jobDescription.trim()}
          >
            <Sparkles className="w-4 h-4" />
            {loading ? t('aiPanel.analyzing') : t('aiPanel.optimize')}
          </Button>
        </div>

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 space-y-4"
            >
              {/* Score */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <ScoreRing score={result.matchScore} size={72} />
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('aiPanel.matchScore')}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{result.summary}</p>
                </div>
              </div>

              {/* Keywords */}
              {(result.keywordMatches.length > 0 || result.missingKeywords.length > 0) && (
                <div className="space-y-2">
                  {result.keywordMatches.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1.5">
                        {t('aiPanel.matchedKeywords', { count: result.keywordMatches.length })}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {result.keywordMatches.map(k => (
                          <Badge key={k} variant="success">{k}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.missingKeywords.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1.5">
                        {t('aiPanel.missingKeywords', { count: result.missingKeywords.length })}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {result.missingKeywords.map(k => (
                          <Badge key={k} variant="danger">{k}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Suggestions */}
              <div>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                  {t('aiPanel.suggestions', { count: result.suggestions.length })}
                </p>
                <div className="space-y-2">
                  {result.suggestions.map(suggestion => (
                    <SuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      onApply={() => handleApply(suggestion)}
                      priorityBadge={priorityBadge(suggestion.priority)}
                      typeIcon={typeIcon(suggestion.type)}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface SuggestionCardProps {
  suggestion: OptimizationSuggestion;
  onApply: () => void;
  priorityBadge: React.ReactNode;
  typeIcon: React.ReactNode;
}

function SuggestionCard({ suggestion, onApply, priorityBadge, typeIcon }: SuggestionCardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      className={`rounded-lg border p-3 text-sm transition-colors ${suggestion.applied
        ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/10'
        : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/50'
        }`}
    >
      <div className="flex items-start gap-2">
        <div className="text-gray-400 dark:text-gray-500 mt-0.5">{typeIcon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{suggestion.section}</span>
            {priorityBadge}
            {suggestion.applied && <Badge variant="success">Applied</Badge>}
          </div>
          <p className="text-gray-800 dark:text-gray-200 font-medium text-xs">{suggestion.issue}</p>
          <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">{suggestion.suggestion}</p>

          {/* Expanded diff view */}
          {expanded && suggestion.improvedText && (
            <div className="mt-2 space-y-1.5">
              {suggestion.originalText && (
                <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-700 dark:text-red-300">
                  <span className="font-medium">Before: </span>{suggestion.originalText}
                </div>
              )}
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded text-xs text-emerald-700 dark:text-emerald-300">
                <span className="font-medium">After: </span>{suggestion.improvedText}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 mt-2">
            {suggestion.improvedText && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                {expanded ? t('aiPanel.hideImprovement') : t('aiPanel.showImprovement')}
              </button>
            )}
            {!suggestion.applied && suggestion.improvedText && (
              <Button
                size="sm"
                variant="secondary"
                className="h-6 text-xs px-2 ml-auto"
                onClick={onApply}
              >
                <Check className="w-3 h-3" /> Apply
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
