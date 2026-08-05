import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Project } from '../../../types/resume';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import { AIRichTextEditor } from './InlineAITools';
import type { InlineAIContext } from './types';

export function ProjectItem({ project, aiContext, onChange, onDelete }: {
  project: Project;
  aiContext: InlineAIContext;
  onChange: (p: Project) => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const up = (key: keyof Project, value: unknown) => onChange({ ...project, [key]: value });

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2 bg-gray-50/50 dark:bg-gray-800/30">
      <div className="flex justify-between">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{project.name || t('resumeEditor.projects.newProject')}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
      <Input label={t('resumeEditor.projects.name')} value={project.name} onChange={e => up('name', e.target.value)} placeholder={t('resumeEditor.projects.namePlaceholder')} />
      <AIRichTextEditor
        label={t('resumeEditor.projects.description')}
        value={project.description}
        onChange={value => up('description', value)}
        minHeight={82}
        placeholder={t('resumeEditor.projects.descriptionPlaceholder')}
        sectionType="project description"
        onApply={value => up('description', value)}
        aiContext={aiContext}
        actions={['rewrite', 'concise', 'tailor', 'grammar']}
      />
      <Input
        label={t('resumeEditor.projects.technologies')}
        value={project.technologies.join(', ')}
        onChange={e => up('technologies', e.target.value.split(',').map(tech => tech.trim()).filter(Boolean))}
        placeholder={t('resumeEditor.projects.technologiesPlaceholder')}
      />
      <div className="grid grid-cols-2 gap-2">
        <Input label={t('resumeEditor.projects.github')} value={project.github ?? ''} onChange={e => up('github', e.target.value)} placeholder={t('resumeEditor.projects.githubPlaceholder')} />
        <Input label={t('resumeEditor.projects.url')} value={project.url ?? ''} onChange={e => up('url', e.target.value)} placeholder={t('resumeEditor.projects.urlPlaceholder')} />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">{t('resumeEditor.projects.keyAchievements')}</label>
        {(project.highlights ?? []).map((h, i) => (
          <div key={i} className="flex mb-1.5">
            <div className="flex-1">
              <AIRichTextEditor
                value={h}
                onChange={value => {
                  const next = [...(project.highlights ?? [])];
                  next[i] = value;
                  up('highlights', next);
                }}
                placeholder={t('resumeEditor.projects.achievementPlaceholder')}
                minHeight={72}
                sectionType="project achievement bullet"
                onApply={value => {
                  const next = [...(project.highlights ?? [])];
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
              onClick={() => up('highlights', (project.highlights ?? []).filter((_, j) => j !== i))}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => up('highlights', [...(project.highlights ?? []), ''])}
          className="mt-1 text-xs"
        >
          <Plus className="w-3 h-3" /> {t('resumeEditor.projects.addAchievement')}
        </Button>
      </div>
    </div>
  );
}
