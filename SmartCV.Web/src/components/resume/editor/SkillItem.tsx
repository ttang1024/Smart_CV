import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Skill } from '../../../types/resume';
import Input from '../../ui/Input';
import Button from '../../ui/Button';

export function SkillItem({ skill, onChange, onDelete }: {
  skill: Skill;
  onChange: (s: Skill) => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-2 items-start">
      <div className="grid grid-cols-2 gap-2 flex-1">
        <Input
          placeholder={t('resumeEditor.skills.categoryPlaceholder')}
          value={skill.category}
          onChange={e => onChange({ ...skill, category: e.target.value })}
        />
        <Input
          placeholder={t('resumeEditor.skills.itemsPlaceholder')}
          value={skill.items.join(', ')}
          onChange={e => onChange({ ...skill, items: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
        />
      </div>
      <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-red-400 mt-0" onClick={onDelete}>
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
