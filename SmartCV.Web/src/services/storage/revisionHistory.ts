import type { Resume } from '../../types/resume';

export interface ResumeRevision {
  id: string;
  resumeId: string;
  label: string;
  createdAt: string;
  resume: Resume;
}

const MAX_REVISIONS = 30;
const STORAGE_PREFIX = 'smartcv:resume-history:';

function keyFor(resumeId: string): string {
  return `${STORAGE_PREFIX}${resumeId}`;
}

function cloneResume(resume: Resume): Resume {
  return JSON.parse(JSON.stringify(resume)) as Resume;
}

function safeRead(resumeId: string): ResumeRevision[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(keyFor(resumeId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ResumeRevision[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWrite(resumeId: string, revisions: ResumeRevision[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(keyFor(resumeId), JSON.stringify(revisions.slice(0, MAX_REVISIONS)));
  } catch {
    // Revision history is best-effort local safety data.
  }
}

export const revisionHistory = {
  get(resumeId: string): ResumeRevision[] {
    return safeRead(resumeId);
  },

  replace(resumeId: string, revisions: ResumeRevision[]): ResumeRevision[] {
    const bounded = revisions.slice(0, MAX_REVISIONS);
    safeWrite(resumeId, bounded);
    return bounded;
  },

  push(resume: Resume, label: string, existing = safeRead(resume.id)): ResumeRevision[] {
    const revision: ResumeRevision = {
      id: crypto.randomUUID(),
      resumeId: resume.id,
      label,
      createdAt: new Date().toISOString(),
      resume: cloneResume(resume),
    };
    const next = [revision, ...existing].slice(0, MAX_REVISIONS);
    safeWrite(resume.id, next);
    return next;
  },

  clear(resumeId: string) {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(keyFor(resumeId));
  },
};
