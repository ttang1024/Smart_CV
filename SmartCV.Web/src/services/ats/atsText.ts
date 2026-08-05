import type { Resume, ResumeSection } from '../../types/resume';
import { richTextToPlainText } from '../../lib/richText';
import { ACTION_VERBS } from './atsConstants';

export function clean(value: string | undefined): string {
  return richTextToPlainText(value ?? '').replace(/\s+/g, ' ').trim();
}

export function wordCount(value: string): number {
  return value.split(/\s+/).filter(Boolean).length;
}

export function sectionHasContent(resume: Resume, section: ResumeSection): boolean {
  switch (section) {
    case 'summary':
      return clean(resume.summary).length > 0;
    case 'coreHighlights':
      return (resume.coreHighlights ?? []).some(item => clean(item.text).length > 0);
    case 'experience':
      return resume.experience.some(exp =>
        [exp.company, exp.position, exp.startDate, exp.endDate, exp.description, ...exp.highlights]
          .some(value => clean(value).length > 0)
      );
    case 'education':
      return resume.education.some(edu =>
        [edu.institution, edu.degree, edu.field, edu.startDate, edu.endDate].some(value => clean(value).length > 0)
      );
    case 'skills':
      return resume.skills.some(skill => skill.items.some(item => item.trim().length > 0));
    case 'projects':
      return resume.projects.some(project =>
        [project.name, project.description, ...project.highlights, ...project.technologies].some(value => clean(value).length > 0)
      );
    case 'certifications':
      return resume.certifications.some(cert => [cert.name, cert.issuer].some(value => clean(value).length > 0));
    case 'languages':
      return resume.languages.some(language => language.language.trim().length > 0);
    case 'interests':
      return (resume.interests ?? []).some(interest => interest.name.trim().length > 0);
    case 'achievements':
      return (resume.achievements ?? []).some(achievement => [achievement.title, achievement.description].some(value => clean(value).length > 0));
    case 'referees':
      return (resume.referees ?? []).some(referee => [referee.name, referee.email, referee.phone].some(value => clean(value).length > 0));
    case 'personalInfo':
      return Object.values(resume.personalInfo).some(value => clean(value).length > 0);
  }
}

export function collectResumeText(resume: Resume): string {
  const parts: Array<string | undefined> = [
    resume.personalInfo.fullName,
    resume.personalInfo.title,
    resume.personalInfo.email,
    resume.personalInfo.phone,
    resume.personalInfo.location,
    resume.personalInfo.website,
    resume.personalInfo.linkedin,
    resume.personalInfo.github,
    clean(resume.summary),
    ...(resume.coreHighlights ?? []).map(item => clean(item.text)),
    ...resume.experience.flatMap(exp => [
      exp.position,
      exp.company,
      exp.location,
      exp.startDate,
      exp.endDate,
      clean(exp.description),
      ...(exp.projects ?? []).flatMap(project => [project.name, project.url, clean(project.description), ...(project.highlights ?? []).map(clean)]),
      ...(exp.productLinks ?? []),
      ...exp.highlights.map(clean),
    ]),
    ...resume.education.flatMap(edu => [edu.institution, edu.degree, edu.field, edu.location, edu.gpa, edu.honors]),
    ...resume.skills.flatMap(skill => [skill.category, ...skill.items]),
    ...resume.projects.flatMap(project => [
      project.name,
      clean(project.description),
      project.url,
      project.github,
      ...project.technologies,
      ...project.highlights.map(clean),
    ]),
    ...resume.certifications.flatMap(cert => [cert.name, cert.issuer, cert.credentialId, cert.url]),
    ...resume.languages.map(language => `${language.language} ${language.proficiency}`),
    ...(resume.achievements ?? []).flatMap(achievement => [achievement.title, achievement.issuer, clean(achievement.description)]),
  ];

  return parts.filter((part): part is string => Boolean(part)).join('\n');
}

export function hasActionVerb(text: string): boolean {
  const firstWord = text.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '');
  return ACTION_VERBS.has(firstWord);
}

export function hasMetric(text: string): boolean {
  return /\d|%|\$|£|€|x\b|times?\b|million|billion|thousand|k\b/i.test(text);
}
