import type { Resume, Language } from '../../types/resume';
import { generateId } from '../../lib/utils';

type Raw = Record<string, unknown>;

const PROFICIENCIES: Language['proficiency'][] = ['Native', 'Fluent', 'Advanced', 'Intermediate', 'Basic'];

const str = (value: unknown): string => (value == null ? '' : String(value));
const optStr = (value: unknown): string | undefined => (value ? String(value) : undefined);
const strList = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : []);
const records = (value: unknown): Raw[] =>
  Array.isArray(value) ? value.filter((v): v is Raw => typeof v === 'object' && v !== null) : [];

/**
 * Map a structured-resume payload into a Resume with fresh ids.
 *
 * Both structuring back ends produce this shape: the AI parser (camelCase keys as
 * prompted) and the server's rule-based parser (which spells `linkedIn` / `gitHub`).
 * Every field is coerced, so a partial or slightly malformed payload still imports.
 */
export function toResume(data: Raw, fileName: string): Resume {
  const info = (data.personalInfo ?? {}) as Raw;
  const now = new Date().toISOString();

  return {
    id: generateId(),
    name: info.fullName ? `${str(info.fullName)}'s Resume` : fileName.replace(/\.pdf$/i, ''),
    createdAt: now,
    updatedAt: now,
    personalInfo: {
      fullName: str(info.fullName),
      email: str(info.email),
      phone: str(info.phone),
      location: str(info.location),
      title: str(info.title),
      linkedin: optStr(info.linkedin ?? info.linkedIn),
      github: optStr(info.github ?? info.gitHub),
      website: optStr(info.website),
    },
    summary: str(data.summary),
    coreHighlights: [],
    experience: records(data.experience).map(e => ({
      id: generateId(),
      company: str(e.company),
      position: str(e.position),
      location: str(e.location),
      startDate: str(e.startDate),
      endDate: e.current ? undefined : optStr(e.endDate),
      current: Boolean(e.current),
      description: str(e.description),
      highlights: strList(e.highlights),
      projects: records(e.projects).map(project => ({
        id: generateId(),
        name: str(project.name),
        url: optStr(project.url),
        description: optStr(project.description),
        highlights: strList(project.highlights),
      })),
      productLinks: strList(e.productLinks),
    })),
    education: records(data.education).map(e => ({
      id: generateId(),
      institution: str(e.institution),
      degree: str(e.degree),
      field: str(e.field),
      location: str(e.location),
      startDate: str(e.startDate),
      endDate: e.current ? undefined : optStr(e.endDate),
      current: Boolean(e.current),
      gpa: optStr(e.gpa),
      honors: optStr(e.honors),
    })),
    skills: records(data.skills).map(s => ({
      id: generateId(),
      category: str(s.category),
      items: strList(s.items),
    })),
    projects: records(data.projects).map(p => ({
      id: generateId(),
      name: str(p.name),
      description: str(p.description),
      technologies: strList(p.technologies),
      highlights: strList(p.highlights),
      url: optStr(p.url),
      github: optStr(p.github ?? p.gitHub),
    })),
    certifications: records(data.certifications).map(c => ({
      id: generateId(),
      name: str(c.name),
      issuer: str(c.issuer),
      date: str(c.date),
      expiryDate: optStr(c.expiryDate),
      credentialId: optStr(c.credentialId),
    })),
    languages: records(data.languages).map(l => ({
      id: generateId(),
      language: str(l.language),
      proficiency: PROFICIENCIES.includes(l.proficiency as Language['proficiency'])
        ? (l.proficiency as Language['proficiency'])
        : 'Intermediate',
    })),
    achievements: records(data.achievements).map(a => ({
      id: generateId(),
      title: str(a.title),
      issuer: optStr(a.issuer),
      date: optStr(a.date),
      description: optStr(a.description),
    })),
    interests: (Array.isArray(data.interests) ? data.interests : []).map(name => ({
      id: generateId(),
      name: str(name),
    })),
    referees: records(data.referees).map(ref => ({
      id: generateId(),
      name: str(ref.name),
      title: optStr(ref.title),
      company: optStr(ref.company),
      email: optStr(ref.email),
      phone: optStr(ref.phone),
    })),
    targetJob: '',
  };
}
