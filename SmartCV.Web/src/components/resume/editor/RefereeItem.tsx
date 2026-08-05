import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Referee } from '../../../types/resume';
import Input from '../../ui/Input';
import Button from '../../ui/Button';

export function RefereeItem({ referee, onChange, onDelete }: {
  referee: Referee;
  onChange: (r: Referee) => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const up = (key: keyof Referee, value: unknown) => onChange({ ...referee, [key]: value });

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2 bg-gray-50/50 dark:bg-gray-800/30">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{referee.name || t('resumeEditor.referees.newReferee')}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <Input label={t('resumeEditor.referees.fullName')} value={referee.name} onChange={e => up('name', e.target.value)} placeholder={t('resumeEditor.referees.fullNamePlaceholder')} />
        </div>
        <Input label={t('resumeEditor.referees.jobTitle')} value={referee.title ?? ''} onChange={e => up('title', e.target.value)} placeholder={t('resumeEditor.referees.jobTitlePlaceholder')} />
        <Input label={t('resumeEditor.referees.company')} value={referee.company ?? ''} onChange={e => up('company', e.target.value)} placeholder={t('resumeEditor.referees.companyPlaceholder')} />
        <Input label={t('resumeEditor.referees.email')} value={referee.email ?? ''} onChange={e => up('email', e.target.value)} placeholder={t('resumeEditor.referees.emailPlaceholder')} />
        <Input label={t('resumeEditor.referees.phone')} value={referee.phone ?? ''} onChange={e => up('phone', e.target.value)} placeholder={t('resumeEditor.referees.phonePlaceholder')} />
      </div>
    </div>
  );
}
