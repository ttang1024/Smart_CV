import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
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

const SECTION_TITLES: Record<string, string> = {
  summary: 'Professional Summary',
  coreHighlights: 'Core Highlights',
  experience: 'Work Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  certifications: 'Certifications',
  languages: 'Languages',
  interests: 'Interests',
  achievements: 'Achievements',
  referees: 'Referees',
};

export default function ResumeEditor({ resume, onChange }: ResumeEditorProps) {
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(new Set(['personalInfo', 'summary']));
  const [dragKey, setDragKey] = useState<SectionKey | null>(null);
  const [dragOverKey, setDragOverKey] = useState<SectionKey | null>(null);

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
              placeholder="Write a concise professional summary highlighting your key skills, experience, and career goals..."
              rows={5}
            />
          </div>
        );
      case 'coreHighlights':
        return (
          <div className="pb-4 space-y-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Short, metrics-driven achievements shown prominently at the top of your resume — e.g. "Grew ARR from $2M → $12M in 2 years".
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
                  placeholder="Led a team of 12 engineers to ship 0→1 product in 6 months"
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
              <Plus className="w-4 h-4" /> Add Highlight
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
              <Plus className="w-4 h-4" /> Add Experience
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
              <Plus className="w-4 h-4" /> Add Education
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
              <Plus className="w-4 h-4" /> Add Skill Category
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
              <Plus className="w-4 h-4" /> Add Project
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
              <Plus className="w-4 h-4" /> Add Certification
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
              <Plus className="w-4 h-4" /> Add Language
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
                  placeholder="e.g. Photography, Hiking, Open Source" className="flex-1" />
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-red-400"
                  onClick={() => update('interests', (resume.interests ?? []).filter(it => it.id !== interest.id))}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm"
              onClick={() => update('interests', [...(resume.interests ?? []), { id: generateId(), name: '' }])}>
              <Plus className="w-4 h-4" /> Add Interest
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
              <Plus className="w-4 h-4" /> Add Achievement
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
              <Plus className="w-4 h-4" /> Add Referee
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
        <SectionHeader id="personalInfo" title="Personal Information" />
        {openSections.has('personalInfo') && (
          <div className="pb-4 grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Input label="Full Name *" value={resume.personalInfo.fullName}
                onChange={e => update('personalInfo', { ...resume.personalInfo, fullName: e.target.value })}
                placeholder="John Doe" />
            </div>
            <div className="col-span-2">
              <Input label="Professional Title" value={resume.personalInfo.title ?? ''}
                onChange={e => update('personalInfo', { ...resume.personalInfo, title: e.target.value })}
                placeholder="Senior Software Engineer" />
            </div>
            <Input label="Email *" type="email" value={resume.personalInfo.email}
              onChange={e => update('personalInfo', { ...resume.personalInfo, email: e.target.value })}
              placeholder="john@example.com" />
            <Input label="Phone" value={resume.personalInfo.phone}
              onChange={e => update('personalInfo', { ...resume.personalInfo, phone: e.target.value })}
              placeholder="+1 (555) 000-0000" />
            <div className="col-span-2">
              <Input label="Location" value={resume.personalInfo.location}
                onChange={e => update('personalInfo', { ...resume.personalInfo, location: e.target.value })}
                placeholder="San Francisco, CA" />
            </div>
            <Input label="LinkedIn" value={resume.personalInfo.linkedin ?? ''}
              onChange={e => update('personalInfo', { ...resume.personalInfo, linkedin: e.target.value })}
              placeholder="linkedin.com/in/johndoe" />
            <Input label="GitHub" value={resume.personalInfo.github ?? ''}
              onChange={e => update('personalInfo', { ...resume.personalInfo, github: e.target.value })}
              placeholder="github.com/johndoe" />
            <div className="col-span-2">
              <Input label="Website" value={resume.personalInfo.website ?? ''}
                onChange={e => update('personalInfo', { ...resume.personalInfo, website: e.target.value })}
                placeholder="johndoe.dev" />
            </div>
          </div>
        )}
      </div>

      {/* Orderable sections */}
      {sectionOrder.map(key => (
        <div
          key={key}
          className={cn('py-1 transition-colors', dragOverKey === key && dragKey !== key && 'bg-indigo-50 dark:bg-indigo-950/30')}
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
              title="Drag to reorder"
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
  const up = (key: keyof Experience, value: unknown) => onChange({ ...experience, [key]: value });

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-3 bg-gray-50/50 dark:bg-gray-800/30">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {experience.position || 'New Position'}
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input
          label="Position *"
          value={experience.position}
          onChange={e => up('position', e.target.value)}
          placeholder="Senior Engineer"
          className="col-span-2"
        />
        <Input label="Company *" value={experience.company} onChange={e => up('company', e.target.value)} placeholder="Acme Inc." />
        <Input label="Location" value={experience.location ?? ''} onChange={e => up('location', e.target.value)} placeholder="Remote" />
        <Input label="Start Date" type="month" value={experience.startDate} onChange={e => up('startDate', e.target.value)} />
        <div>
          <Input
            label="End Date"
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
            <span className="text-xs text-gray-600 dark:text-gray-400">Currently working here</span>
          </label>
        </div>
      </div>
      <Textarea
        label="Description"
        value={experience.description}
        onChange={e => up('description', e.target.value)}
        placeholder="Brief overview of your role..."
        rows={2}
      />
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">Key Achievements</label>
        {experience.highlights.map((h, i) => (
          <div key={i} className="flex mb-1.5">
            <textarea
              value={h}
              onChange={e => {
                const next = [...experience.highlights];
                next[i] = e.target.value;
                up('highlights', next);
              }}
              placeholder="Achieved X by doing Y, resulting in Z"
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
          <Plus className="w-3 h-3" /> Add Achievement
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
  const up = (key: keyof Education, value: unknown) => onChange({ ...education, [key]: value });

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-3 bg-gray-50/50 dark:bg-gray-800/30">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {education.institution || 'New Institution'}
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <Input label="Institution *" value={education.institution} onChange={e => up('institution', e.target.value)} placeholder="MIT" />
        </div>
        <Input label="Degree *" value={education.degree} onChange={e => up('degree', e.target.value)} placeholder="Bachelor's" />
        <Input label="Field of Study *" value={education.field} onChange={e => up('field', e.target.value)} placeholder="Computer Science" />
        <Input label="Start Date" type="month" value={education.startDate} onChange={e => up('startDate', e.target.value)} />
        <div>
          <Input
            label="End Date"
            type="month"
            value={education.endDate ?? ''}
            onChange={e => up('endDate', e.target.value)}
            disabled={education.current}
          />
          <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
            <input type="checkbox" checked={education.current} onChange={e => up('current', e.target.checked)} className="rounded" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Currently enrolled</span>
          </label>
        </div>
        <Input label="GPA" value={education.gpa ?? ''} onChange={e => up('gpa', e.target.value)} placeholder="3.9/4.0" />
        <Input label="Honors" value={education.honors ?? ''} onChange={e => up('honors', e.target.value)} placeholder="Magna Cum Laude" />
      </div>
    </div>
  );
}

function SkillItem({ skill, onChange, onDelete }: {
  skill: Skill;
  onChange: (s: Skill) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex gap-2 items-start">
      <div className="grid grid-cols-2 gap-2 flex-1">
        <Input
          placeholder="Category (e.g. Languages)"
          value={skill.category}
          onChange={e => onChange({ ...skill, category: e.target.value })}
        />
        <Input
          placeholder="Skills (comma-separated)"
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
  const up = (key: keyof Project, value: unknown) => onChange({ ...project, [key]: value });

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2 bg-gray-50/50 dark:bg-gray-800/30">
      <div className="flex justify-between">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{project.name || 'New Project'}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
      <Input label="Project Name *" value={project.name} onChange={e => up('name', e.target.value)} placeholder="My App" />
      <Textarea label="Description *" value={project.description} onChange={e => up('description', e.target.value)} rows={2} placeholder="What it does..." />
      <Input
        label="Technologies"
        value={project.technologies.join(', ')}
        onChange={e => up('technologies', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
        placeholder="React, TypeScript, Node.js"
      />
      <div className="grid grid-cols-2 gap-2">
        <Input label="GitHub URL" value={project.github ?? ''} onChange={e => up('github', e.target.value)} placeholder="github.com/..." />
        <Input label="Live URL" value={project.url ?? ''} onChange={e => up('url', e.target.value)} placeholder="myapp.com" />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">Key Achievements</label>
        {(project.highlights ?? []).map((h, i) => (
          <div key={i} className="flex mb-1.5">
            <textarea
              value={h}
              onChange={e => {
                const next = [...(project.highlights ?? [])];
                next[i] = e.target.value;
                up('highlights', next);
              }}
              placeholder="Achieved X by doing Y, resulting in Z"
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
          <Plus className="w-3 h-3" /> Add Achievement
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
  const up = (key: keyof Certification, value: unknown) => onChange({ ...certification, [key]: value });

  return (
    <div className="flex gap-2 items-start">
      <div className="grid grid-cols-2 gap-2 flex-1">
        <Input placeholder="Certification Name" value={certification.name} onChange={e => up('name', e.target.value)} />
        <Input placeholder="Issuer" value={certification.issuer} onChange={e => up('issuer', e.target.value)} />
        <Input label="Issue Date" type="month" value={certification.date} onChange={e => up('date', e.target.value)} />
        <Input label="Expiry Date" type="month" value={certification.expiryDate ?? ''} onChange={e => up('expiryDate', e.target.value)} />
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
  return (
    <div className="flex gap-2 items-center">
      <Input
        placeholder="Language"
        value={language.language}
        onChange={e => onChange({ ...language, language: e.target.value })}
        className="flex-1"
      />
      <select
        value={language.proficiency}
        onChange={e => onChange({ ...language, proficiency: e.target.value as Language['proficiency'] })}
        className="h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 text-sm text-gray-900 dark:text-gray-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
      >
        {(['Native', 'Fluent', 'Advanced', 'Intermediate', 'Basic'] as Language['proficiency'][]).map(p => (
          <option key={p} value={p}>{p}</option>
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
  const up = (key: keyof Achievement, value: unknown) => onChange({ ...achievement, [key]: value });

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2 bg-gray-50/50 dark:bg-gray-800/30">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{achievement.title || 'New Achievement'}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="space-y-2">
        <Input label="Title *" value={achievement.title} onChange={e => up('title', e.target.value)} placeholder="Employee of the Year" />
        <Input label="Issuer / Organisation" value={achievement.issuer ?? ''} onChange={e => up('issuer', e.target.value)} placeholder="Acme Inc." />
        <Input label="Date" type="month" value={achievement.date ?? ''} onChange={e => up('date', e.target.value)} />
      </div>
      <Textarea
        label="Description"
        value={achievement.description ?? ''}
        onChange={e => up('description', e.target.value)}
        rows={2}
        placeholder="Brief details about this achievement..."
      />
    </div>
  );
}

function RefereeItem({ referee, onChange, onDelete }: {
  referee: Referee;
  onChange: (r: Referee) => void;
  onDelete: () => void;
}) {
  const up = (key: keyof Referee, value: unknown) => onChange({ ...referee, [key]: value });

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2 bg-gray-50/50 dark:bg-gray-800/30">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{referee.name || 'New Referee'}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <Input label="Full Name *" value={referee.name} onChange={e => up('name', e.target.value)} placeholder="Jane Smith" />
        </div>
        <Input label="Job Title" value={referee.title ?? ''} onChange={e => up('title', e.target.value)} placeholder="Engineering Manager" />
        <Input label="Company" value={referee.company ?? ''} onChange={e => up('company', e.target.value)} placeholder="Acme Inc." />
        <Input label="Email" value={referee.email ?? ''} onChange={e => up('email', e.target.value)} placeholder="jane@acme.com" />
        <Input label="Phone" value={referee.phone ?? ''} onChange={e => up('phone', e.target.value)} placeholder="+1 (555) 000-0000" />
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
