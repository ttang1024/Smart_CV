import { create } from 'zustand';
import type { Resume } from '../types/resume';
import type { OptimizationSession } from '../types/ai';
import { resumeDB, optimizationDB } from '../services/storage/indexedDB';

interface ResumeState {
  resumes: Resume[];
  currentResume: Resume | null;
  currentOptimization: OptimizationSession | null;
  optimizations: OptimizationSession[];
  loading: boolean;
  error: string | null;

  loadResumes: () => Promise<void>;
  loadResume: (id: string) => Promise<void>;
  createResume: (name?: string) => Promise<Resume>;
  saveResume: (resume: Resume) => Promise<void>;
  deleteResume: (id: string) => Promise<void>;
  duplicateResume: (id: string) => Promise<Resume | null>;
  setCurrentResume: (resume: Resume | null) => void;
  updateCurrentResume: (updates: Partial<Resume>) => void;

  loadOptimizations: (resumeId: string) => Promise<void>;
  saveOptimization: (session: OptimizationSession) => Promise<void>;
  setCurrentOptimization: (session: OptimizationSession | null) => void;
  deleteOptimization: (id: string) => Promise<void>;
}

export const createEmptyResume = (name = 'My Resume'): Resume => ({
  id: crypto.randomUUID(),
  name,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  personalInfo: {
    fullName: '',
    email: '',
    phone: '',
    location: '',
    title: ''
  },
  summary: '',
  coreHighlights: [],
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
  languages: [],
  interests: [],
  achievements: [],
  referees: [],
  targetJob: ''
});

export const useResumeStore = create<ResumeState>((set, get) => ({
  resumes: [],
  currentResume: null,
  currentOptimization: null,
  optimizations: [],
  loading: false,
  error: null,

  loadResumes: async () => {
    set({ loading: true, error: null });
    try {
      const resumes = await resumeDB.getAll();
      set({ resumes, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  loadResume: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const resume = await resumeDB.get(id);
      set({ currentResume: resume ?? null, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  createResume: async (name?: string) => {
    const resume = createEmptyResume(name);
    await resumeDB.save(resume);
    set(state => ({ resumes: [resume, ...state.resumes], currentResume: resume }));
    return resume;
  },

  saveResume: async (resume: Resume) => {
    const updated = { ...resume, updatedAt: new Date().toISOString() };
    await resumeDB.save(updated);
    set(state => ({
      resumes: state.resumes.map(r => r.id === updated.id ? updated : r),
      currentResume: state.currentResume?.id === updated.id ? updated : state.currentResume
    }));
  },

  deleteResume: async (id: string) => {
    await resumeDB.delete(id);
    set(state => ({
      resumes: state.resumes.filter(r => r.id !== id),
      currentResume: state.currentResume?.id === id ? null : state.currentResume
    }));
  },

  duplicateResume: async (id: string) => {
    const copy = await resumeDB.duplicate(id);
    if (copy) {
      set(state => ({ resumes: [copy, ...state.resumes] }));
    }
    return copy;
  },

  setCurrentResume: (resume: Resume | null) => {
    set({ currentResume: resume });
  },

  updateCurrentResume: (updates: Partial<Resume>) => {
    set(state => {
      if (!state.currentResume) return state;
      return { currentResume: { ...state.currentResume, ...updates } };
    });
  },

  loadOptimizations: async (resumeId: string) => {
    const optimizations = await optimizationDB.getByResume(resumeId);
    set({ optimizations });
  },

  saveOptimization: async (session: OptimizationSession) => {
    await optimizationDB.save(session);
    set(state => {
      const exists = state.optimizations.find(o => o.id === session.id);
      return {
        optimizations: exists
          ? state.optimizations.map(o => o.id === session.id ? session : o)
          : [session, ...state.optimizations],
        currentOptimization: session
      };
    });
  },

  setCurrentOptimization: (session: OptimizationSession | null) => {
    set({ currentOptimization: session });
  },

  deleteOptimization: async (id: string) => {
    await optimizationDB.delete(id);
    set(state => ({
      optimizations: state.optimizations.filter(o => o.id !== id),
      currentOptimization: state.currentOptimization?.id === id ? null : state.currentOptimization
    }));
  }
}));
