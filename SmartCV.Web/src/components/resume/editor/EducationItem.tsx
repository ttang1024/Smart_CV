import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Education } from '../../../types/resume';
import Input from '../../ui/Input';
import Button from '../../ui/Button';

export function EducationItem({ education, onChange, onDelete }: {
  education: Education;
  onChange: (e: Education) => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const up = (key: keyof Education, value: unknown) => onChange({ ...education, [key]: value });

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-3 bg-gray-50/50 dark:bg-gray-800/30">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {education.institution || t('resumeEditor.education.newInstitution')}
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <Input label={t('resumeEditor.education.institution')} value={education.institution} onChange={e => up('institution', e.target.value)} placeholder={t('resumeEditor.education.institutionPlaceholder')} />
        </div>
        <Input label={t('resumeEditor.education.degree')} value={education.degree} onChange={e => up('degree', e.target.value)} placeholder={t('resumeEditor.education.degreePlaceholder')} />
        <Input label={t('resumeEditor.education.field')} value={education.field} onChange={e => up('field', e.target.value)} placeholder={t('resumeEditor.education.fieldPlaceholder')} />
        <Input label={t('resumeEditor.education.startDate')} type="month" value={education.startDate} onChange={e => up('startDate', e.target.value)} />
        <div>
          <Input
            label={t('resumeEditor.education.endDate')}
            type="month"
            value={education.endDate ?? ''}
            onChange={e => up('endDate', e.target.value)}
            disabled={education.current}
          />
          <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
            <input type="checkbox" checked={education.current} onChange={e => up('current', e.target.checked)} className="rounded" />
            <span className="text-xs text-gray-600 dark:text-gray-400">{t('resumeEditor.education.currentlyEnrolled')}</span>
          </label>
        </div>
        <Input label={t('resumeEditor.education.gpa')} value={education.gpa ?? ''} onChange={e => up('gpa', e.target.value)} placeholder={t('resumeEditor.education.gpaPlaceholder')} />
        <Input label={t('resumeEditor.education.honors')} value={education.honors ?? ''} onChange={e => up('honors', e.target.value)} placeholder={t('resumeEditor.education.honorsPlaceholder')} />
      </div>
    </div>
  );
}
