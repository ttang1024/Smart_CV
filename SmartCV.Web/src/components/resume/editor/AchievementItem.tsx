import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Achievement } from '../../../types/resume';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import { AIRichTextEditor } from './InlineAITools';
import type { InlineAIContext } from './types';

export function AchievementItem({ achievement, aiContext, onChange, onDelete }: {
  achievement: Achievement;
  aiContext: InlineAIContext;
  onChange: (a: Achievement) => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const up = (key: keyof Achievement, value: unknown) => onChange({ ...achievement, [key]: value });

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2 bg-gray-50/50 dark:bg-gray-800/30">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{achievement.title || t('resumeEditor.achievements.newAchievement')}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="space-y-2">
        <Input label={t('resumeEditor.achievements.title')} value={achievement.title} onChange={e => up('title', e.target.value)} placeholder={t('resumeEditor.achievements.titlePlaceholder')} />
        <Input label={t('resumeEditor.achievements.issuer')} value={achievement.issuer ?? ''} onChange={e => up('issuer', e.target.value)} placeholder={t('resumeEditor.achievements.issuerPlaceholder')} />
        <Input label={t('resumeEditor.achievements.date')} type="month" value={achievement.date ?? ''} onChange={e => up('date', e.target.value)} />
      </div>
      <AIRichTextEditor
        label={t('resumeEditor.achievements.description')}
        value={achievement.description ?? ''}
        onChange={value => up('description', value)}
        minHeight={82}
        placeholder={t('resumeEditor.achievements.descriptionPlaceholder')}
        sectionType="achievement description"
        onApply={value => up('description', value)}
        aiContext={aiContext}
        actions={['rewrite', 'concise', 'metrics', 'tailor', 'grammar']}
      />
    </div>
  );
}
