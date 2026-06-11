import { AlertCircle, ArrowRight, Check, Languages, Save, Sparkles } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import type { Resume } from '../../types/resume';
import { translateResume } from '../../services/ai/resumeTranslator';
import { resumeDB } from '../../services/storage/indexedDB';
import { richTextToPlainText } from '../../lib/richText';
import { useSettingsStore } from '../../store/settingsStore';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface TranslatePanelProps {
  resume: Resume;
  onOpenResume: (resumeId: string) => void;
}

const LANGUAGES: Array<{ value: string; label: string }> = [
  { value: 'English', label: 'English' },
  { value: 'Simplified Chinese', label: '简体中文' },
  { value: 'Traditional Chinese', label: '繁體中文' },
  { value: 'Spanish', label: 'Español' },
  { value: 'French', label: 'Français' },
  { value: 'German', label: 'Deutsch' },
  { value: 'Japanese', label: '日本語' },
  { value: 'Korean', label: '한국어' },
  { value: 'Portuguese', label: 'Português' },
  { value: 'Italian', label: 'Italiano' },
];

export default function TranslatePanel({ resume, onOpenResume }: TranslatePanelProps) {
  const { getActiveConfig, aiSettings } = useSettingsStore();
  const [language, setLanguage] = useState('English');
  const [customLanguage, setCustomLanguage] = useState('');
  const [translated, setTranslated] = useState<Resume | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeProvider = aiSettings.activeProvider;
  const config = getActiveConfig();
  const custom = customLanguage.trim();
  const targetLanguage = custom || language;
  const languageLabel = custom || LANGUAGES.find(option => option.value === language)?.label || language;

  const handleTranslate = async () => {
    if (!config) {
      setError(`No API key configured for ${activeProvider}. Go to Settings.`);
      return;
    }

    setLoading(true);
    setError(null);
    setTranslated(null);
    setSavedId(null);
    try {
      const result = await translateResume(config.provider, config.apiKey, config.model, {
        resume,
        targetLanguage,
        languageLabel,
      });
      setTranslated(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Translation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!translated) return;
    setSaving(true);
    try {
      await resumeDB.save(translated);
      setSavedId(translated.id);
      toast.success('Translated resume saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Saving failed');
    } finally {
      setSaving(false);
    }
  };

  const summaryExcerpt = translated ? richTextToPlainText(translated.summary).slice(0, 220) : '';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
        <div className="flex items-center gap-2">
          <Languages className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Translate Resume</h2>
          <Badge variant="info" className="ml-auto">{activeProvider.toUpperCase()}</Badge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Translate the whole resume into another language and save it as a new copy.
            Names, dates, links, and technical terms are preserved; the original resume is not changed.
          </p>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Target language
            </p>
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGES.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setLanguage(option.value);
                    setCustomLanguage('');
                  }}
                  className={`h-8 rounded-lg border text-xs font-medium transition-colors ${
                    !custom && language === option.value
                      ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <Input
              placeholder="Other language (e.g. Dutch, Vietnamese)..."
              value={customLanguage}
              onChange={e => setCustomLanguage(e.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="break-words min-w-0">{error}</span>
            </div>
          )}

          <Button className="w-full" loading={loading} onClick={handleTranslate}>
            <Sparkles className="w-4 h-4" />
            {loading ? 'Translating...' : `Translate to ${languageLabel}`}
          </Button>

          {translated && (
            <div className="space-y-3 p-3 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="text-sm font-medium text-gray-900 dark:text-white break-words min-w-0">
                  {translated.name}
                </p>
              </div>
              {translated.personalInfo.title && (
                <p className="text-xs text-gray-600 dark:text-gray-300">{translated.personalInfo.title}</p>
              )}
              {summaryExcerpt && (
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {summaryExcerpt}
                  {richTextToPlainText(translated.summary).length > 220 ? '…' : ''}
                </p>
              )}

              {savedId ? (
                <Button variant="secondary" className="w-full" onClick={() => onOpenResume(savedId)}>
                  <ArrowRight className="w-4 h-4" />
                  Open Translated Resume
                </Button>
              ) : (
                <Button className="w-full" loading={saving} onClick={handleSave}>
                  <Save className="w-4 h-4" />
                  Save as New Resume
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
