import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Resume, Experience, Education, Skill, Project, Certification, Language, Interest, Achievement, Referee, ResumeSection } from '../../types/resume';
import { DEFAULT_SECTION_ORDER } from '../../types/resume';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';
import { cn, generateId } from '../../lib/utils';

interface ResumeEditorProps {
  resume: Resume;
  onChange: (resume: Resume) => void;
}

type SectionKey = ResumeSection;

export default function ResumeEditor({ resume, onChange }: ResumeEditorProps) {
  const { t } = useTranslation();
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(new Set(['personalInfo', 'summary']));
  const [dragKey, setDragKey] = useState<SectionKey | null>(null);
  const [dragOverKey, setDragOverKey] = useState<SectionKey | null>(null);

  const SECTION_TITLES: Record<string, string> = {
    summary: t('resumeEditor.sections.summary'),
    coreHighlights: t('resumeEditor.sections.coreHighlights'),
    experience: t('resumeEditor.sections.experience'),
    education: t('resumeEditor.sections.education'),
    skills: t('resumeEditor.sections.skills'),
    projects: t('resumeEditor.sections.projects'),
    certifications: t('resumeEditor.sections.certifications'),
    languages: t('resumeEditor.sections.languages'),
    interests: t('resumeEditor.sections.interests'),
    achievements: t('resumeEditor.sections.achievements'),
    referees: t('resumeEditor.sections.referees'),
  };

  const sectionOrder = (resume.sectionOrder ?? DEFAULT_SECTION_ORDER) as SectionKey[];

  const toggleSection = (section: SectionKey) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const update = (key: keyof Resume, value: unknown) => {
    onChange({ ...resume, [key]: value });
  };

  const handleDrop = (targetKey: SectionKey) => {
    if (!dragKey || dragKey === targetKey) return;
    const order = [...sectionOrder];
    const fromIdx = order.indexOf(dragKey);
    const toIdx = order.indexOf(targetKey);
    if (fromIdx === -1 || toIdx === -1) return;
    order.splice(fromIdx, 1);
    order.splice(toIdx, 0, dragKey);
    onChange({ ...resume, sectionOrder: order });
    setDragKey(null);
    setDragOverKey(null);
  };

  const SectionHeader = ({ id, title, count }: { id: SectionKey; title: string; count?: number }) => (
    <button
      type="button"
      onClick={() => toggleSection(id)}
      className="flex-1 flex items-center justify-between py-3 text-left group min-w-0"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate">{title}</span>
        {count !== undefined && (
          <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full shrink-0">{count}</span>
        )}
      </div>
      {openSections.has(id)
        ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
        : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
      }
    </button>
  );

  const getSectionCount = (key: SectionKey): number | undefined => {
    switch (key) {
      case 'coreHighlights': return (resume.coreHighlights ?? []).length;
      case 'experience': return resume.experience.length;
      case 'education': return resume.education.length;
      case 'skills': return resume.skills.length;
      case 'projects': return resume.projects.length;
      case 'certifications': return resume.certifications.length;
      case 'languages': return resume.languages.length;
      case 'interests': return (resume.interests ?? []).length;
      case 'achievements': return (resume.achievements ?? []).length;
      case 'referees': return (resume.referees ?? []).length;
      default: return undefined;
    }
  };

  const renderSectionContent = (key: SectionKey) => {
    switch (key) {
      case 'summary':
        return (
          <div className="pb-4">
            <Textarea
              value={resume.summary}
              onChange={e => update('summary', e.target.value)}
              placeholder={t('resumeEditor.summary.placeholder')}
              rows={5}
            />
          </div>
        );
      case 'coreHighlights':
        return (
          <div className="pb-4 space-y-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('resumeEditor.coreHighlights.hint')}
            </p>
            {(resume.coreHighlights ?? []).map((hl, i) => (
              <div key={hl.id} className="flex gap-2 items-center">
                <span className="text-gray-400 dark:text-gray-500 text-sm select-none w-4 text-right shrink-0">{i + 1}.</span>
                <Input
                  value={hl.text}
                  onChange={e => {
                    const next = (resume.coreHighlights ?? []).map(h => h.id === hl.id ? { ...h, text: e.target.value } : h);
                    update('coreHighlights', next);
                  }}
                  placeholder={t('resumeEditor.coreHighlights.placeholder')}
                  className="flex-1"
                />
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-red-400"
                  onClick={() => update('coreHighlights', (resume.coreHighlights ?? []).filter(h => h.id !== hl.id))}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm"
              onClick={() => update('coreHighlights', [...(resume.coreHighlights ?? []), { id: generateId(), text: '' }])}>
              <Plus className="w-4 h-4" /> {t('resumeEditor.coreHighlights.add')}
            </Button>
          </div>
        );
      case 'experience':
        return (
          <div className="pb-4 space-y-4">
            {resume.experience.map((exp, idx) => (
              <ExperienceItem key={exp.id} experience={exp} index={idx}
                onChange={updated => update('experience', resume.experience.map(e => e.id === updated.id ? updated : e))}
                onDelete={() => update('experience', resume.experience.filter(e => e.id !== exp.id))} />
            ))}
            <Button variant="outline" size="sm"
              onClick={() => update('experience', [...resume.experience, createEmptyExperience()])}>
              <Plus className="w-4 h-4" /> {t('resumeEditor.experience.add')}
            </Button>
          </div>
        );
      case 'education':
        return (
          <div className="pb-4 space-y-4">
            {resume.education.map(edu => (
              <EducationItem key={edu.id} education={edu}
                onChange={updated => update('education', resume.education.map(e => e.id === updated.id ? updated : e))}
                onDelete={() => update('education', resume.education.filter(e => e.id !== edu.id))} />
            ))}
            <Button variant="outline" size="sm"
              onClick={() => update('education', [...resume.education, createEmptyEducation()])}>
              <Plus className="w-4 h-4" /> {t('resumeEditor.education.add')}
            </Button>
          </div>
        );
      case 'skills':
        return (
          <div className="pb-4 space-y-3">
            {resume.skills.map(skill => (
              <SkillItem key={skill.id} skill={skill}
                onChange={updated => update('skills', resume.skills.map(s => s.id === updated.id ? updated : s))}
                onDelete={() => update('skills', resume.skills.filter(s => s.id !== skill.id))} />
            ))}
            <Button variant="outline" size="sm"
              onClick={() => update('skills', [...resume.skills, { id: generateId(), category: '', items: [] }])}>
              <Plus className="w-4 h-4" /> {t('resumeEditor.skills.add')}
            </Button>
          </div>
        );
      case 'projects':
        return (
          <div className="pb-4 space-y-4">
            {resume.projects.map(project => (
              <ProjectItem key={project.id} project={project}
                onChange={updated => update('projects', resume.projects.map(p => p.id === updated.id ? updated : p))}
                onDelete={() => update('projects', resume.projects.filter(p => p.id !== project.id))} />
            ))}
            <Button variant="outline" size="sm"
              onClick={() => update('projects', [...resume.projects, createEmptyProject()])}>
              <Plus className="w-4 h-4" /> {t('resumeEditor.projects.add')}
            </Button>
          </div>
        );
      case 'certifications':
        return (
          <div className="pb-4 space-y-3">
            {resume.certifications.map(cert => (
              <CertificationItem key={cert.id} certification={cert}
                onChange={updated => update('certifications', resume.certifications.map(c => c.id === updated.id ? updated : c))}
                onDelete={() => update('certifications', resume.certifications.filter(c => c.id !== cert.id))} />
            ))}
            <Button variant="outline" size="sm"
              onClick={() => update('certifications', [...resume.certifications, createEmptyCertification()])}>
              <Plus className="w-4 h-4" /> {t('resumeEditor.certifications.add')}
            </Button>
          </div>
        );
      case 'languages':
        return (
          <div className="pb-4 space-y-2">
            {resume.languages.map(lang => (
              <LanguageItem key={lang.id} language={lang}
                onChange={updated => update('languages', resume.languages.map(l => l.id === updated.id ? updated : l))}
                onDelete={() => update('languages', resume.languages.filter(l => l.id !== lang.id))} />
            ))}
            <Button variant="outline" size="sm"
              onClick={() => update('languages', [...resume.languages, { id: generateId(), language: '', proficiency: 'Intermediate' as const }])}>
              <Plus className="w-4 h-4" /> {t('resumeEditor.languages.add')}
            </Button>
          </div>
        );
      case 'interests':
        return (
          <div className="pb-4 space-y-2">
            {(resume.interests ?? []).map((interest, i) => (
              <div key={interest.id} className="flex gap-2 items-center">
                <span className="text-gray-400 dark:text-gray-500 text-sm select-none w-4 text-right shrink-0">{i + 1}.</span>
                <Input value={interest.name}
                  onChange={e => {
                    const next = (resume.interests ?? []).map(it => it.id === interest.id ? { ...it, name: e.target.value } : it);
                    update('interests', next);
                  }}
                  placeholder={t('resumeEditor.interests.placeholder')} className="flex-1" />
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-red-400"
                  onClick={() => update('interests', (resume.interests ?? []).filter(it => it.id !== interest.id))}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm"
              onClick={() => update('interests', [...(resume.interests ?? []), { id: generateId(), name: '' }])}>
              <Plus className="w-4 h-4" /> {t('resumeEditor.interests.add')}
            </Button>
          </div>
        );
      case 'achievements':
        return (
          <div className="pb-4 space-y-3">
            {(resume.achievements ?? []).map(achievement => (
              <AchievementItem key={achievement.id} achievement={achievement}
                onChange={updated => update('achievements', (resume.achievements ?? []).map(a => a.id === updated.id ? updated : a))}
                onDelete={() => update('achievements', (resume.achievements ?? []).filter(a => a.id !== achievement.id))} />
            ))}
            <Button variant="outline" size="sm"
              onClick={() => update('achievements', [...(resume.achievements ?? []), createEmptyAchievement()])}>
              <Plus className="w-4 h-4" /> {t('resumeEditor.achievements.add')}
            </Button>
          </div>
        );
      case 'referees':
        return (
          <div className="pb-4 space-y-3">
            {(resume.referees ?? []).map(referee => (
              <RefereeItem key={referee.id} referee={referee}
                onChange={updated => update('referees', (resume.referees ?? []).map(r => r.id === updated.id ? updated : r))}
                onDelete={() => update('referees', (resume.referees ?? []).filter(r => r.id !== referee.id))} />
            ))}
            <Button variant="outline" size="sm"
              onClick={() => update('referees', [...(resume.referees ?? []), { id: generateId(), name: '' }])}>
              <Plus className="w-4 h-4" /> {t('resumeEditor.referees.add')}
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-0 divide-y divide-gray-200 dark:divide-gray-700">
      {/* Personal Info — fixed, not draggable */}
      <div className="py-1">
        <SectionHeader id="personalInfo" title={t('resumeEditor.sections.personalInfo')} />
        {openSections.has('personalInfo') && (
          <div className="pb-4 grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Input label={t('resumeEditor.personalInfo.fullName')} value={resume.personalInfo.fullName}
                onChange={e => update('personalInfo', { ...resume.personalInfo, fullName: e.target.value })}
                placeholder={t('resumeEditor.personalInfo.fullNamePlaceholder')} />
            </div>
            <div className="col-span-2">
              <Input label={t('resumeEditor.personalInfo.title')} value={resume.personalInfo.title ?? ''}
                onChange={e => update('personalInfo', { ...resume.personalInfo, title: e.target.value })}
                placeholder={t('resumeEditor.personalInfo.titlePlaceholder')} />
            </div>
            <Input label={t('resumeEditor.personalInfo.email')} type="email" value={resume.personalInfo.email}
              onChange={e => update('personalInfo', { ...resume.personalInfo, email: e.target.value })}
              placeholder={t('resumeEditor.personalInfo.emailPlaceholder')} />
            <Input label={t('resumeEditor.personalInfo.phone')} value={resume.personalInfo.phone}
              onChange={e => update('personalInfo', { ...resume.personalInfo, phone: e.target.value })}
              placeholder={t('resumeEditor.personalInfo.phonePlaceholder')} />
            <div className="col-span-2">
              <Input label={t('resumeEditor.personalInfo.location')} value={resume.personalInfo.location}
                onChange={e => update('personalInfo', { ...resume.personalInfo, location: e.target.value })}
                placeholder={t('resumeEditor.personalInfo.locationPlaceholder')} />
            </div>
            <Input label={t('resumeEditor.personalInfo.linkedin')} value={resume.personalInfo.linkedin ?? ''}
              onChange={e => update('personalInfo', { ...resume.personalInfo, linkedin: e.target.value })}
              placeholder={t('resumeEditor.personalInfo.linkedinPlaceholder')} />
            <Input label={t('resumeEditor.personalInfo.github')} value={resume.personalInfo.github ?? ''}
              onChange={e => update('personalInfo', { ...resume.personalInfo, github: e.target.value })}
              placeholder={t('resumeEditor.personalInfo.githubPlaceholder')} />
            <div className="col-span-2">
              <Input label={t('resumeEditor.personalInfo.website')} value={resume.personalInfo.website ?? ''}
                onChange={e => update('personalInfo', { ...resume.personalInfo, website: e.target.value })}
                placeholder={t('resumeEditor.personalInfo.websitePlaceholder')} />
            </div>
          </div>
        )}
      </div>

      {/* Orderable sections */}
      {sectionOrder.map(key => (
        <div
          key={key}
          className={cn('py-1 transition-colors', dragOverKey === key && dragKey !== key && 'bg-emerald-50 dark:bg-emerald-950/30')}
          onDragOver={e => { e.preventDefault(); setDragOverKey(key); }}
          onDrop={() => handleDrop(key)}
          onDragLeave={() => setDragOverKey(null)}
        >
          <div className="flex items-center gap-1">
            <span
              draggable
              onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setDragKey(key); }}
              onDragEnd={() => { setDragKey(null); setDragOverKey(null); }}
              className="cursor-grab text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-400 shrink-0 py-3 px-0.5"
              title={t('resumeEditor.dragToReorder')}
            >
              <GripVertical className="w-4 h-4" />
            </span>
            <SectionHeader id={key} title={SECTION_TITLES[key] ?? key} count={getSectionCount(key)} />
          </div>
          {openSections.has(key) && renderSectionContent(key)}
        </div>
      ))}
    </div>
  );
}

// Sub-components

function ExperienceItem({ experience, onChange, onDelete }: {
  experience: Experience;
  index: number;
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
      <Textarea
        label={t('resumeEditor.experience.description')}
        value={experience.description}
        onChange={e => up('description', e.target.value)}
        placeholder={t('resumeEditor.experience.descriptionPlaceholder')}
        rows={2}
      />
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">{t('resumeEditor.experience.keyAchievements')}</label>
        {experience.highlights.map((h, i) => (
          <div key={i} className="flex mb-1.5">
            <textarea
              value={h}
              onChange={e => {
                const next = [...experience.highlights];
                next[i] = e.target.value;
                up('highlights', next);
              }}
              placeholder={t('resumeEditor.experience.achievementPlaceholder')}
              className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              rows={2}
            />
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

function EducationItem({ education, onChange, onDelete }: {
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

function SkillItem({ skill, onChange, onDelete }: {
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

function ProjectItem({ project, onChange, onDelete }: {
  project: Project;
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
      <Textarea label={t('resumeEditor.projects.description')} value={project.description} onChange={e => up('description', e.target.value)} rows={2} placeholder={t('resumeEditor.projects.descriptionPlaceholder')} />
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
            <textarea
              value={h}
              onChange={e => {
                const next = [...(project.highlights ?? [])];
                next[i] = e.target.value;
                up('highlights', next);
              }}
              placeholder={t('resumeEditor.projects.achievementPlaceholder')}
              className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              rows={2}
            />
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

function CertificationItem({ certification, onChange, onDelete }: {
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

function LanguageItem({ language, onChange, onDelete }: {
  language: Language;
  onChange: (l: Language) => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();

  const PROFICIENCY_OPTIONS: { value: Language['proficiency']; label: string }[] = [
    { value: 'Native',       label: t('resumeEditor.languages.proficiency.native') },
    { value: 'Fluent',       label: t('resumeEditor.languages.proficiency.fluent') },
    { value: 'Advanced',     label: t('resumeEditor.languages.proficiency.advanced') },
    { value: 'Intermediate', label: t('resumeEditor.languages.proficiency.intermediate') },
    { value: 'Basic',        label: t('resumeEditor.languages.proficiency.basic') },
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

function AchievementItem({ achievement, onChange, onDelete }: {
  achievement: Achievement;
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
      <Textarea
        label={t('resumeEditor.achievements.description')}
        value={achievement.description ?? ''}
        onChange={e => up('description', e.target.value)}
        rows={2}
        placeholder={t('resumeEditor.achievements.descriptionPlaceholder')}
      />
    </div>
  );
}

function RefereeItem({ referee, onChange, onDelete }: {
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

// Factories
const createEmptyExperience = (): Experience => ({
  id: generateId(), company: '', position: '', location: '', startDate: '', endDate: '', current: false, description: '', highlights: []
});

const createEmptyEducation = (): Education => ({
  id: generateId(), institution: '', degree: '', field: '', location: '', startDate: '', endDate: '', current: false
});

const createEmptyProject = (): Project => ({
  id: generateId(), name: '', description: '', technologies: [], highlights: []
});

const createEmptyCertification = (): Certification => ({
  id: generateId(), name: '', issuer: '', date: ''
});

const createEmptyAchievement = (): Achievement => ({
  id: generateId(), title: ''
});
