import type { ExportHistoryItem, JobApplication, JobApplicationStatus } from '../../types/jobApplication';

const STORAGE_KEY = 'smartcv:job-applications';

function readAll(): JobApplication[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as JobApplication[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(applications: JobApplication[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
}

export const jobApplicationDB = {
  getAll(): JobApplication[] {
    return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  get(id: string): JobApplication | undefined {
    return readAll().find(application => application.id === id);
  },

  getByResume(resumeId: string): JobApplication[] {
    return readAll()
      .filter(application => application.baseResumeId === resumeId || application.versionResumeId === resumeId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  save(application: JobApplication): JobApplication {
    const applications = readAll();
    const now = new Date().toISOString();
    const next = { ...application, updatedAt: now };
    const index = applications.findIndex(item => item.id === application.id);
    if (index >= 0) applications[index] = next;
    else applications.unshift(next);
    writeAll(applications);
    return next;
  },

  updateStatus(id: string, status: JobApplicationStatus): JobApplication | undefined {
    const application = this.get(id);
    if (!application) return undefined;
    return this.save({ ...application, status });
  },

  addExport(id: string, exportItem: ExportHistoryItem): JobApplication | undefined {
    const application = this.get(id);
    if (!application) return undefined;
    return this.save({
      ...application,
      exportHistory: [exportItem, ...application.exportHistory].slice(0, 20),
    });
  },

  delete(id: string) {
    writeAll(readAll().filter(application => application.id !== id));
  },
};
