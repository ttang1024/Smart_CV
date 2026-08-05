import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Experience } from '../../../types/resume';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import { generateId } from '../../../lib/utils';
import { AIRichTextEditor } from './InlineAITools';
import type { InlineAIContext } from './types';

export function ExperienceItem({ experience, aiContext, onChange, onDelete }: {
  experience: Experience;
  index: number;
  aiContext: InlineAIContext;
  onChange: (e: Experience) => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const up = (key: keyof Experience, value: unknown) => onChange({ ...experience, [key]: value });

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-3 bg-gray-50/50 dark:bg-gray-800/30">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {experience.position || t('resumeEditor.experience.newPosition')}
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input
          label={t('resumeEditor.experience.position')}
          value={experience.position}
          onChange={e => up('position', e.target.value)}
          placeholder={t('resumeEditor.experience.positionPlaceholder')}
          className="col-span-2"
        />
        <Input label={t('resumeEditor.experience.company')} value={experience.company} onChange={e => up('company', e.target.value)} placeholder={t('resumeEditor.experience.companyPlaceholder')} />
        <Input label={t('resumeEditor.experience.location')} value={experience.location ?? ''} onChange={e => up('location', e.target.value)} placeholder={t('resumeEditor.experience.locationPlaceholder')} />
        <Input label={t('resumeEditor.experience.startDate')} type="month" value={experience.startDate} onChange={e => up('startDate', e.target.value)} />
        <div>
          <Input
            label={t('resumeEditor.experience.endDate')}
            type="month"
            value={experience.endDate ?? ''}
            onChange={e => up('endDate', e.target.value)}
            disabled={experience.current}
          />
          <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={experience.current}
              onChange={e => up('current', e.target.checked)}
              className="rounded"
            />
            <span className="text-xs text-gray-600 dark:text-gray-400">{t('resumeEditor.experience.currentlyWorking')}</span>
          </label>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">{t('resumeEditor.experience.projects')}</label>
        {(experience.projects ?? []).map(project => (
          <div key={project.id} className="mb-2 rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-900/40">
            <div className="flex items-start gap-2">
              <div className="grid grid-cols-2 gap-2 flex-1">
                <Input
                  value={project.name}
                  onChange={e => {
                    const next = (experience.projects ?? []).map(item =>
                      item.id === project.id ? { ...item, name: e.target.value } : item
                    );
                    up('projects', next);
                  }}
                  placeholder={t('resumeEditor.experience.projectNamePlaceholder')}
                />
                <Input
                  value={project.url ?? ''}
                  onChange={e => {
                    const next = (experience.projects ?? []).map(item =>
                      item.id === project.id ? { ...item, url: e.target.value } : item
                    );
                    up('projects', next);
                  }}
                  placeholder={t('resumeEditor.experience.projectUrlPlaceholder')}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-red-400"
                onClick={() => up('projects', (experience.projects ?? []).filter(item => item.id !== project.id))}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="mt-2">
              <AIRichTextEditor
                value={project.description ?? ''}
                onChange={value => {
                  const next = (experience.projects ?? []).map(item =>
                    item.id === project.id ? { ...item, description: value } : item
                  );
                  up('projects', next);
                }}
                placeholder={t('resumeEditor.experience.projectDescriptionPlaceholder')}
                minHeight={72}
                sectionType="work experience project description"
                onApply={value => {
                  const next = (experience.projects ?? []).map(item =>
                    item.id === project.id ? { ...item, description: value } : item
                  );
                  up('projects', next);
                }}
                aiContext={aiContext}
                actions={['rewrite', 'concise', 'tailor', 'grammar']}
              />
            </div>
            <div className="mt-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1.5">{t('resumeEditor.experience.projectKeyAchievements')}</label>
              {(project.highlights ?? []).map((highlight, i) => (
                <div key={i} className="flex gap-2 mb-1.5">
                  <div className="flex-1">
                    <AIRichTextEditor
                      value={highlight}
                      onChange={value => {
                        const highlights = [...(project.highlights ?? [])];
                        highlights[i] = value;
                        const next = (experience.projects ?? []).map(item =>
                          item.id === project.id ? { ...item, highlights } : item
                        );
                        up('projects', next);
                      }}
                      placeholder={t('resumeEditor.experience.projectAchievementPlaceholder')}
                      minHeight={64}
                      sectionType="work experience project achievement"
                      onApply={value => {
                        const highlights = [...(project.highlights ?? [])];
                        highlights[i] = value;
                        const next = (experience.projects ?? []).map(item =>
                          item.id === project.id ? { ...item, highlights } : item
                        );
                        up('projects', next);
                      }}
                      aiContext={aiContext}
                      actions={['rewrite', 'concise', 'metrics', 'tailor', 'grammar']}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-red-400"
                    onClick={() => {
                      const highlights = (project.highlights ?? []).filter((_, j) => j !== i);
                      const next = (experience.projects ?? []).map(item =>
                        item.id === project.id ? { ...item, highlights } : item
                      );
                      up('projects', next);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const highlights = [...(project.highlights ?? []), ''];
                  const next = (experience.projects ?? []).map(item =>
                    item.id === project.id ? { ...item, highlights } : item
                  );
                  up('projects', next);
                }}
                className="mt-1 text-xs"
              >
                <Plus className="w-3 h-3" /> {t('resumeEditor.experience.addProjectAchievement')}
              </Button>
            </div>
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => up('projects', [...(experience.projects ?? []), { id: generateId(), name: '', url: '', description: '', highlights: [] }])}
          className="mt-1 text-xs"
        >
          <Plus className="w-3 h-3" /> {t('resumeEditor.experience.addProject')}
        </Button>
      </div>
      <AIRichTextEditor
        label={t('resumeEditor.experience.description')}
        value={experience.description}
        onChange={value => up('description', value)}
        placeholder={t('resumeEditor.experience.descriptionPlaceholder')}
        minHeight={82}
        sectionType="experience description"
        onApply={value => up('description', value)}
        aiContext={aiContext}
        actions={['rewrite', 'concise', 'tailor', 'grammar']}
      />
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">{t('resumeEditor.experience.keyAchievements')}</label>
        {experience.highlights.map((h, i) => (
          <div key={i} className="flex mb-1.5">
            <div className="flex-1">
              <AIRichTextEditor
                value={h}
                onChange={value => {
                  const next = [...experience.highlights];
                  next[i] = value;
                  up('highlights', next);
                }}
                placeholder={t('resumeEditor.experience.achievementPlaceholder')}
                minHeight={72}
                sectionType="experience achievement bullet"
                onApply={value => {
                  const next = [...experience.highlights];
                  next[i] = value;
                  up('highlights', next);
                }}
                aiContext={aiContext}
                actions={['rewrite', 'concise', 'metrics', 'tailor', 'grammar']}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-red-400"
              onClick={() => up('highlights', experience.highlights.filter((_, j) => j !== i))}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => up('highlights', [...experience.highlights, ''])}
          className="mt-1 text-xs"
        >
          <Plus className="w-3 h-3" /> {t('resumeEditor.experience.addAchievement')}
        </Button>
      </div>
    </div>
  );
}
