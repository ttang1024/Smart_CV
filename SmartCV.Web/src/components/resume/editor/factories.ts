import type { Experience, Education, Project, Certification, Achievement } from '../../../types/resume';
import { generateId } from '../../../lib/utils';

export const createEmptyExperience = (): Experience => ({
  id: generateId(), company: '', position: '', location: '', startDate: '', endDate: '', current: false, description: '', highlights: [], productLinks: [], projects: []
});

export const createEmptyEducation = (): Education => ({
  id: generateId(), institution: '', degree: '', field: '', location: '', startDate: '', endDate: '', current: false
});

export const createEmptyProject = (): Project => ({
  id: generateId(), name: '', description: '', technologies: [], highlights: []
});

export const createEmptyCertification = (): Certification => ({
  id: generateId(), name: '', issuer: '', date: ''
});

export const createEmptyAchievement = (): Achievement => ({
  id: generateId(), title: ''
});
