import { AlertCircle, Clipboard, Mail, Send, Sparkles } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import type { Resume } from '../../types/resume';
import type { FollowUpEmailTone, FollowUpEmailType } from '../../services/ai/emailService';
import { generateFollowUpEmail } from '../../services/ai/emailService';
import { useSettingsStore } from '../../store/settingsStore';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';

interface FollowUpEmailPanelProps {
  resume: Resume;
  jobContext?: {
    jobTitle: string;
    company: string;
    jobDescription: string;
  };
  onJobContextChange?: (updates: Partial<{ jobTitle: string; company: string; jobDescription: string }>) => void;
}

const EMAIL_TYPES: Array<{ value: FollowUpEmailType; label: string }> = [
  { value: 'interview-thank-you', label: 'Thank-You' },
  { value: 'application-follow-up', label: 'Follow-Up' },
  { value: 'status-inquiry', label: 'Status Check' },
  { value: 'referral-request', label: 'Referral Ask' },
];

const TONES: Array<{ value: FollowUpEmailTone; label: string }> = [
  { value: 'professional', label: 'Professional' },
  { value: 'warm', label: 'Warm' },
  { value: 'confident', label: 'Confident' },
  { value: 'concise', label: 'Concise' },
];

export default function FollowUpEmailPanel({ resume, jobContext, onJobContextChange }: FollowUpEmailPanelProps) {
  const { getActiveConfig, aiSettings } = useSettingsStore();
  const [emailType, setEmailType] = useState<FollowUpEmailType>('interview-thank-you');
  const [tone, setTone] = useState<FollowUpEmailTone>('professional');
  const [recipientName, setRecipientName] = useState('');
  const [jobTitle, setJobTitleState] = useState(jobContext?.jobTitle || resume.targetJob || '');
  const [company, setCompanyState] = useState(jobContext?.company ?? '');
  const [context, setContext] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeProvider = aiSettings.activeProvider;
  const config = getActiveConfig();

  const setJobTitle = (value: string) => {
    setJobTitleState(value);
    onJobContextChange?.({ jobTitle: value });
  };

  const setCompany = (value: string) => {
    setCompanyState(value);
    onJobContextChange?.({ company: value });
  };

  const handleGenerate = async () => {
    if (!config) {
      setError(`No API key configured for ${activeProvider}. Go to Settings.`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const email = await generateFollowUpEmail(config.provider, config.apiKey, config.model, {
        resume,
        emailType,
        recipientName,
        jobTitle,
        company,
        jobDescription: jobContext?.jobDescription,
        context,
        tone,
      });
      setSubject(email.subject);
      setBody(email.body);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Email generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!body.trim()) return;
    await navigator.clipboard.writeText(subject.trim() ? `Subject: ${subject}\n\n${body}` : body);
    toast.success('Email copied');
  };

  const handleOpenMailApp = () => {
    if (!body.trim()) return;
    const href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-cyan-50 to-sky-50 dark:from-cyan-950/30 dark:to-sky-950/30">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Follow-Up Email</h2>
          <Badge variant="info" className="ml-auto">{activeProvider.toUpperCase()}</Badge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Email type
            </p>
            <div className="grid grid-cols-2 gap-2">
              {EMAIL_TYPES.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setEmailType(option.value)}
                  className={`h-8 rounded-lg border text-xs font-medium transition-colors ${
                    emailType === option.value
                      ? 'border-cyan-500 bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Input
              placeholder="Recipient name (optional)"
              value={recipientName}
              onChange={e => setRecipientName(e.target.value)}
            />
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
            <div className="grid grid-cols-2 gap-2">
              {TONES.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTone(option.value)}
                  className={`h-8 rounded-lg border text-xs font-medium transition-colors ${
                    tone === option.value
                      ? 'border-cyan-500 bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <Textarea
              placeholder="Context (optional) — e.g. what was discussed in the interview, when you applied..."
              value={context}
              onChange={e => setContext(e.target.value)}
              rows={4}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="break-words min-w-0">{error}</span>
            </div>
          )}

          <Button className="w-full" loading={loading} onClick={handleGenerate}>
            <Sparkles className="w-4 h-4" />
            {loading ? 'Generating...' : body ? 'Regenerate Email' : 'Generate Email'}
          </Button>

          {body && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Draft
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={handleCopy}>
                    <Clipboard className="w-3.5 h-3.5" />
                    Copy
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleOpenMailApp}>
                    <Send className="w-3.5 h-3.5" />
                    Mail App
                  </Button>
                </div>
              </div>
              <Input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Subject"
              />
              <Textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={14}
                className="leading-relaxed"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
