import type { z } from 'zod';
import type { ResumeSchema, SectionSchema } from '../lib/resumeSchema';

// Inferred from the zod schema in lib/resumeSchema.ts — edit the schema, not these types.
export type Resume = z.infer<typeof ResumeSchema>;
export type ResumeSection = z.infer<typeof SectionSchema>;

export type Experience = Resume['experience'][number];
export type Education = Resume['education'][number];
export type Skill = Resume['skills'][number];
export type Project = Resume['projects'][number];
export type Certification = Resume['certifications'][number];
export type Language = Resume['languages'][number];
export type Referee = Resume['referees'][number];
export type Achievement = Resume['achievements'][number];

export const DEFAULT_SECTION_ORDER: ResumeSection[] = [
  'summary', 'coreHighlights', 'experience', 'education', 'skills',
  'projects', 'certifications', 'languages', 'achievements', 'interests', 'referees',
];
