import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Resume, ResumeSection } from '../../types/resume';
import { DEFAULT_SECTION_ORDER } from '../../types/resume';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { cn, generateId } from '../../lib/utils';
import { AIRichTextEditor } from './editor/InlineAITools';
import { ExperienceItem } from './editor/ExperienceItem';
import { EducationItem } from './editor/EducationItem';
import { SkillItem } from './editor/SkillItem';
import { ProjectItem } from './editor/ProjectItem';
import { CertificationItem } from './editor/CertificationItem';
import { LanguageItem } from './editor/LanguageItem';
import { AchievementItem } from './editor/AchievementItem';
import { RefereeItem } from './editor/RefereeItem';
import {
  createEmptyExperience,
  createEmptyEducation,
  createEmptyProject,
  createEmptyCertification,
  createEmptyAchievement,
} from './editor/factories';

interface ResumeEditorProps {
  resume: Resume;
  onChange: (resume: Resume) => void;
  jobContext?: {
    jobTitle: string;
    company: string;
    jobDescription: string;
  };
}

type SectionKey = ResumeSection;

export default function ResumeEditor({ resume, onChange, jobContext }: ResumeEditorProps) {
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

  const updateSectionTitle = (key: SectionKey, value: string) => {
    onChange({
      ...resume,
      sectionTitles: {
        ...(resume.sectionTitles ?? {}),
        [key]: value,
      },
    });
  };

  const aiContext = {
    jobDescription: [
      jobContext?.jobTitle && `Role: ${jobContext.jobTitle}`,
      jobContext?.company && `Company: ${jobContext.company}`,
      jobContext?.jobDescription,
    ].filter(Boolean).join('\n\n'),
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

  const renderSectionHeader = (id: SectionKey, title: string, count?: number) => (
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
            <AIRichTextEditor
              value={resume.summary}
              onChange={value => update('summary', value)}
              placeholder={t('resumeEditor.summary.placeholder')}
              minHeight={132}
              sectionType="professional summary"
              onApply={value => update('summary', value)}
              aiContext={aiContext}
              actions={['rewrite', 'concise', 'tailor', 'grammar']}
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
              <div key={hl.id} className="flex gap-2 items-start">
                <span className="text-gray-400 dark:text-gray-500 text-sm select-none w-4 text-right shrink-0 pt-2">{i + 1}.</span>
                <div className="min-w-0 flex-1">
                  <AIRichTextEditor
                    value={hl.text}
                    onChange={value => {
                      const next = (resume.coreHighlights ?? []).map(h => h.id === hl.id ? { ...h, text: value } : h);
                      update('coreHighlights', next);
                    }}
                    placeholder={t('resumeEditor.coreHighlights.placeholder')}
                    minHeight={72}
                    sectionType="core highlight"
                    onApply={value => {
                      const next = (resume.coreHighlights ?? []).map(h => h.id === hl.id ? { ...h, text: value } : h);
                      update('coreHighlights', next);
                    }}
                    aiContext={aiContext}
                    actions={['rewrite', 'concise', 'metrics', 'tailor', 'grammar']}
                  />
                </div>
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
                aiContext={aiContext}
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
                aiContext={aiContext}
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
                aiContext={aiContext}
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

  const renderPreviewTitleInput = (id: SectionKey, fallback: string) => (
    <div className="pb-3">
      <Input
        label="Preview title"
        value={resume.sectionTitles?.[id] ?? ''}
        onChange={e => updateSectionTitle(id, e.target.value)}
        placeholder={fallback}
      />
    </div>
  );

  return (
    <div className="space-y-0 divide-y divide-gray-200 dark:divide-gray-700">
      {/* Personal Info — fixed, not draggable */}
      <div className="py-1">
        {renderSectionHeader('personalInfo', t('resumeEditor.sections.personalInfo'))}
        {openSections.has('personalInfo') && (
          <>
            {renderPreviewTitleInput('personalInfo', t('resumeEditor.sections.personalInfo'))}
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
          </>
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
            {renderSectionHeader(key, SECTION_TITLES[key] ?? key, getSectionCount(key))}
          </div>
          {openSections.has(key) && (
            <>
              {renderPreviewTitleInput(key, SECTION_TITLES[key] ?? key)}
              {renderSectionContent(key)}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
