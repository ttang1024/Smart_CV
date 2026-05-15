import { AlertCircle, Clipboard, Download, FileText, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import type { Resume } from '../../types/resume';
import type { CoverLetterRequest } from '../../services/ai/aiService';
import { generateCoverLetter } from '../../services/ai/aiService';
import { useSettingsStore } from '../../store/settingsStore';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';

interface CoverLetterPanelProps {
  resume: Resume;
  jobContext?: {
    jobTitle: string;
    company: string;
    jobDescription: string;
  };
  onJobContextChange?: (updates: Partial<{ jobTitle: string; company: string; jobDescription: string }>) => void;
}

type CoverLetterTone = NonNullable<CoverLetterRequest['tone']>;

const tones: Array<{ value: CoverLetterTone; label: string }> = [
  { value: 'professional', label: 'Professional' },
  { value: 'warm', label: 'Warm' },
  { value: 'confident', label: 'Confident' },
  { value: 'concise', label: 'Concise' },
];

export default function CoverLetterPanel({ resume, jobContext, onJobContextChange }: CoverLetterPanelProps) {
  const { getActiveConfig, aiSettings } = useSettingsStore();
  const [jobTitle, setJobTitleState] = useState(jobContext?.jobTitle || resume.targetJob || '');
  const [company, setCompanyState] = useState(jobContext?.company ?? '');
  const [hiringManager, setHiringManager] = useState('');
  const [jobDescription, setJobDescriptionState] = useState(jobContext?.jobDescription ?? '');
  const [tone, setTone] = useState<CoverLetterTone>('professional');
  const [letter, setLetter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeProvider = aiSettings.activeProvider;
  const config = getActiveConfig();
  const wordCount = useMemo(() => letter.split(/\s+/).filter(Boolean).length, [letter]);

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

  const handleGenerate = async () => {
    if (!config) {
      setError(`No API key configured for ${activeProvider}. Go to Settings.`);
      return;
    }
    if (!jobDescription.trim()) {
      setError('Please paste the job description first.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const generated = await generateCoverLetter(
        config.provider,
        config.apiKey,
        config.model,
        {
          resume,
          jobDescription,
          jobTitle,
          company,
          hiringManager,
          tone,
        },
      );
      setLetter(generated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cover letter generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!letter.trim()) return;
    await navigator.clipboard.writeText(letter);
    toast.success('Cover letter copied');
  };

  const handleDownload = () => {
    if (!letter.trim()) return;
    const filenameBase = [resume.personalInfo.fullName, company, jobTitle, 'cover-letter']
      .filter(Boolean)
      .join('-')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'cover-letter';
    const blob = new Blob([letter], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filenameBase}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-sky-50 to-emerald-50 dark:from-sky-950/30 dark:to-emerald-950/30">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Cover Letter</h2>
          <Badge variant="info" className="ml-auto">{activeProvider.toUpperCase()}</Badge>
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
            <Input
              placeholder="Hiring Manager (optional)"
              value={hiringManager}
              onChange={e => setHiringManager(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              {tones.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTone(option.value)}
                  className={`h-8 rounded-lg border text-xs font-medium transition-colors ${
                    tone === option.value
                      ? 'border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <Textarea
              placeholder="Paste the full job description here..."
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
              rows={7}
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
            disabled={!jobDescription.trim()}
          >
            <Sparkles className="w-4 h-4" />
            {loading ? 'Generating...' : letter ? 'Regenerate Cover Letter' : 'Generate Cover Letter'}
          </Button>

          {letter && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Draft
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{wordCount} words</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={handleCopy}>
                    <Clipboard className="w-3.5 h-3.5" />
                    Copy
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleDownload}>
                    <Download className="w-3.5 h-3.5" />
                    TXT
                  </Button>
                </div>
              </div>
              <Textarea
                value={letter}
                onChange={e => setLetter(e.target.value)}
                rows={18}
                className="font-serif leading-relaxed"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
