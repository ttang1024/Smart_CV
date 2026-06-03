import { AlertCircle, Clipboard, MessageSquareText, Plus, Sparkles, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import type { Resume } from '../../types/resume';
import type { InterviewPrepResult } from '../../services/ai/aiService';
import { generateInterviewPrep } from '../../services/ai/aiService';
import { QUESTION_BANK } from '../../data/interviewQuestions';
import { useSettingsStore } from '../../store/settingsStore';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';

interface InterviewPrepPanelProps {
  resume: Resume;
  jobContext?: {
    jobTitle: string;
    company: string;
    jobDescription: string;
  };
  onJobContextChange?: (updates: Partial<{ jobTitle: string; company: string; jobDescription: string }>) => void;
}

const defaultQuestions = [
  'Tell me about yourself.',
  'Why are you interested in this role?',
  'Describe a challenging project you delivered.',
  'Tell me about a time you worked with stakeholders.',
].join('\n');

function formatPrepForClipboard(result: InterviewPrepResult): string {
  const answers = result.answers.map((item, index) => [
    `Question ${index + 1}: ${item.question}`,
    item.answer,
    item.keyPoints.length > 0 ? `Key points: ${item.keyPoints.join('; ')}` : '',
  ].filter(Boolean).join('\n')).join('\n\n');

  const stories = result.starStories.map((story, index) => [
    `STAR ${index + 1}: ${story.title}`,
    `Competency: ${story.competency}`,
    `Situation: ${story.situation}`,
    `Task: ${story.task}`,
    `Action: ${story.action}`,
    `Result: ${story.result}`,
    story.bestForQuestions.length > 0 ? `Best for: ${story.bestForQuestions.join('; ')}` : '',
  ].filter(Boolean).join('\n')).join('\n\n');

  return [answers, stories].filter(Boolean).join('\n\n---\n\n');
}

export default function InterviewPrepPanel({ resume, jobContext, onJobContextChange }: InterviewPrepPanelProps) {
  const { getActiveConfig, aiSettings } = useSettingsStore();
  const [jobTitle, setJobTitleState] = useState(jobContext?.jobTitle || resume.targetJob || '');
  const [company, setCompanyState] = useState(jobContext?.company ?? '');
  const [jobDescription, setJobDescriptionState] = useState(jobContext?.jobDescription ?? '');
  const [questionsText, setQuestionsText] = useState(defaultQuestions);
  const [starStoryCount, setStarStoryCount] = useState(4);
  const [result, setResult] = useState<InterviewPrepResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeProvider = aiSettings.activeProvider;
  const config = getActiveConfig();
  const questions = useMemo(
    () => questionsText.split('\n').map(line => line.trim()).filter(Boolean),
    [questionsText],
  );

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

  const addQuestionCategory = (categoryQuestions: string[]) => {
    setQuestionsText(prev => {
      const existing = new Set(prev.split('\n').map(line => line.trim()).filter(Boolean));
      const additions = categoryQuestions.filter(question => !existing.has(question));
      if (additions.length === 0) {
        toast('Those questions are already added');
        return prev;
      }
      const base = prev.trim();
      return base ? `${base}\n${additions.join('\n')}` : additions.join('\n');
    });
  };

  const handleGenerate = async () => {
    if (!config) {
      setError(`No API key configured for ${activeProvider}. Go to Settings.`);
      return;
    }
    if (questions.length === 0 && starStoryCount < 1) {
      setError('Add interview questions or request at least one STAR story.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const generated = await generateInterviewPrep(
        config.provider,
        config.apiKey,
        config.model,
        {
          resume,
          jobDescription,
          jobTitle,
          company,
          questions,
          starStoryCount,
        },
      );
      setResult(generated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Interview prep generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(formatPrepForClipboard(result));
    toast.success('Interview prep copied');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-violet-50 to-sky-50 dark:from-violet-950/30 dark:to-sky-950/30">
        <div className="flex items-center gap-2">
          <MessageSquareText className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Interview Prep</h2>
          <Badge variant="purple" className="ml-auto">{activeProvider.toUpperCase()}</Badge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Job Title"
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
              />
              <Input
                placeholder="Company"
                value={company}
                onChange={e => setCompany(e.target.value)}
              />
            </div>
            <Textarea
              placeholder="Paste the job description for more targeted answers..."
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
              rows={5}
            />
            <div className="space-y-1.5">
              <p className="text-xs text-gray-500 dark:text-gray-400">Add from question bank:</p>
              <div className="flex flex-wrap gap-1.5">
                {QUESTION_BANK.map(category => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => addQuestionCategory(category.questions)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    {category.label}
                  </button>
                ))}
              </div>
            </div>
            <Textarea
              placeholder="Add interview questions, one per line..."
              value={questionsText}
              onChange={e => setQuestionsText(e.target.value)}
              rows={6}
            />
            <Input
              type="number"
              min={1}
              max={8}
              value={starStoryCount}
              onChange={e => setStarStoryCount(Math.max(1, Math.min(8, Number(e.target.value) || 1)))}
              placeholder="STAR story count"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="break-words min-w-0">{error}</span>
            </div>
          )}

          <Button
            className="w-full"
            loading={loading}
            onClick={handleGenerate}
            disabled={questions.length === 0 && starStoryCount < 1}
          >
            <Sparkles className="w-4 h-4" />
            {loading ? 'Generating...' : result ? 'Regenerate Prep' : 'Generate Prep'}
          </Button>

          {result && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Interview Kit
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {result.answers.length} answers · {result.starStories.length} STAR stories
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={handleCopy}>
                  <Clipboard className="w-3.5 h-3.5" />
                  Copy
                </Button>
              </div>

              {result.answers.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Answers
                  </p>
                  {result.answers.map((item, index) => (
                    <div key={`${item.question}-${index}`} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.question}</p>
                      <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{item.answer}</p>
                      {item.keyPoints.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {item.keyPoints.map(point => (
                            <Badge key={point} variant="info">{point}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {result.starStories.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    STAR Stories
                  </p>
                  {result.starStories.map((story, index) => (
                    <div key={`${story.title}-${index}`} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-3">
                      <div className="flex items-start gap-2">
                        <Star className="w-4 h-4 mt-0.5 text-amber-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{story.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{story.competency}</p>
                        </div>
                      </div>
                      {[
                        ['Situation', story.situation],
                        ['Task', story.task],
                        ['Action', story.action],
                        ['Result', story.result],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
                          <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{value}</p>
                        </div>
                      ))}
                      {story.bestForQuestions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {story.bestForQuestions.map(question => (
                            <Badge key={question}>{question}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
