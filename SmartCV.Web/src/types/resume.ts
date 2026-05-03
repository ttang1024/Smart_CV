export interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  website?: string;
  linkedin?: string;
  github?: string;
  title?: string;
}

export interface Experience {
  id: string;
  company: string;
  position: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description: string;
  highlights: string[];
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  gpa?: string;
  honors?: string;
  description?: string;
}

export interface Skill {
  id: string;
  category: string;
  items: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  url?: string;
  github?: string;
  startDate?: string;
  endDate?: string;
  highlights: string[];
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  expiryDate?: string;
  credentialId?: string;
  url?: string;
}

export interface Language {
  id: string;
  language: string;
  proficiency: 'Native' | 'Fluent' | 'Advanced' | 'Intermediate' | 'Basic';
}

export interface CoreHighlight {
  id: string;
  text: string;
}

export interface Interest {
  id: string;
  name: string;
}

export interface Referee {
  id: string;
  name: string;
  title?: string;
  company?: string;
  email?: string;
  phone?: string;
}

export interface Achievement {
  id: string;
  title: string;
  issuer?: string;
  date?: string;
  description?: string;
}

export interface Resume {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  sectionOrder?: ResumeSection[];
  sectionTitles?: Partial<Record<ResumeSection, string>>;
  personalInfo: PersonalInfo;
  summary: string;
  coreHighlights: CoreHighlight[];
  experience: Experience[];
  education: Education[];
  skills: Skill[];
  projects: Project[];
  certifications: Certification[];
  languages: Language[];
  interests: Interest[];
  achievements: Achievement[];
  referees: Referee[];
  targetJob?: string;
}

export type ResumeSection = 'personalInfo' | 'summary' | 'coreHighlights' | 'experience' | 'education' | 'skills' | 'projects' | 'certifications' | 'languages' | 'interests' | 'achievements' | 'referees';

export const DEFAULT_SECTION_ORDER: ResumeSection[] = [
  'summary', 'coreHighlights', 'experience', 'education', 'skills',
  'projects', 'certifications', 'languages', 'achievements', 'interests', 'referees',
];
