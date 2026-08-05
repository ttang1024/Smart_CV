import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Certification } from '../../../types/resume';
import Input from '../../ui/Input';
import Button from '../../ui/Button';

export function CertificationItem({ certification, onChange, onDelete }: {
  certification: Certification;
  onChange: (c: Certification) => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const up = (key: keyof Certification, value: unknown) => onChange({ ...certification, [key]: value });

  return (
    <div className="flex gap-2 items-start">
      <div className="grid grid-cols-2 gap-2 flex-1">
        <Input placeholder={t('resumeEditor.certifications.name')} value={certification.name} onChange={e => up('name', e.target.value)} />
        <Input placeholder={t('resumeEditor.certifications.issuer')} value={certification.issuer} onChange={e => up('issuer', e.target.value)} />
        <Input label={t('resumeEditor.certifications.issueDate')} type="month" value={certification.date} onChange={e => up('date', e.target.value)} />
        <Input label={t('resumeEditor.certifications.expiryDate')} type="month" value={certification.expiryDate ?? ''} onChange={e => up('expiryDate', e.target.value)} />
      </div>
      <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-red-400" onClick={onDelete}>
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
