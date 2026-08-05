import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Language } from '../../../types/resume';
import Input from '../../ui/Input';
import Button from '../../ui/Button';

export function LanguageItem({ language, onChange, onDelete }: {
  language: Language;
  onChange: (l: Language) => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();

  const PROFICIENCY_OPTIONS: { value: Language['proficiency']; label: string }[] = [
    { value: 'Native', label: t('resumeEditor.languages.proficiency.native') },
    { value: 'Fluent', label: t('resumeEditor.languages.proficiency.fluent') },
    { value: 'Advanced', label: t('resumeEditor.languages.proficiency.advanced') },
    { value: 'Intermediate', label: t('resumeEditor.languages.proficiency.intermediate') },
    { value: 'Basic', label: t('resumeEditor.languages.proficiency.basic') },
  ];

  return (
    <div className="flex gap-2 items-center">
      <Input
        placeholder={t('resumeEditor.languages.language')}
        value={language.language}
        onChange={e => onChange({ ...language, language: e.target.value })}
        className="flex-1"
      />
      <select
        value={language.proficiency}
        onChange={e => onChange({ ...language, proficiency: e.target.value as Language['proficiency'] })}
        className="h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 text-sm text-gray-900 dark:text-gray-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
      >
        {PROFICIENCY_OPTIONS.map(({ value, label }) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
      <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-red-400" onClick={onDelete}>
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
