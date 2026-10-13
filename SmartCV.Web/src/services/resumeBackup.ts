import type { Resume } from '../types/resume';
import { resumeDB } from './storage/indexedDB';
import { fromJsonResume, isJsonResume } from './jsonResume';
import { parseResume, SmartCvBackupSchema } from '../lib/resumeSchema';
import { downloadJson } from '../lib/download';

export const BACKUP_SCHEMA_VERSION = 1;

/** Download every resume as a SmartCV backup file. Returns how many were exported. */
export async function exportAllResumes(): Promise<number> {
  const resumes = await resumeDB.getAll();
  const exportedAt = new Date().toISOString();
  downloadJson(
    { app: 'SmartCV', schemaVersion: BACKUP_SCHEMA_VERSION, exportedAt, source: 'indexeddb', resumes },
    `smartcv-resumes-${exportedAt.slice(0, 10)}.json`,
  );
  return resumes.length;
}

export type ImportResult =
  | { kind: 'backup'; imported: number; skipped: number; renamed: number }
  | { kind: 'jsonResume'; resume: Resume }
  | { kind: 'unrecognised' };

/**
 * Import a SmartCV backup (or a bare array of resumes) or a JSON Resume file.
 *
 * Every resume is schema-validated; invalid entries are skipped rather than aborting
 * the whole import. A resume whose id already exists locally is imported under a new id
 * instead of silently overwriting the existing one. All valid resumes are written in one
 * transaction.
 */
export async function importResumeFile(file: File): Promise<ImportResult> {
  const payload: unknown = JSON.parse(await file.text());

  const backup = SmartCvBackupSchema.safeParse(payload);
  const entries = backup.success ? backup.data.resumes : Array.isArray(payload) ? payload : null;

  if (entries) {
    const valid: Resume[] = [];
    let renamed = 0;
    const takenIds = new Set<string>();
    for (const entry of entries) {
      let resume: Resume;
      try {
        resume = parseResume(entry);
      } catch {
        continue;
      }
      if (takenIds.has(resume.id) || (await resumeDB.exists(resume.id))) {
        resume = { ...resume, id: crypto.randomUUID() };
        renamed++;
      }
      takenIds.add(resume.id);
      valid.push(resume);
    }
    if (valid.length > 0) await resumeDB.saveMany(valid);
    return { kind: 'backup', imported: valid.length, skipped: entries.length - valid.length, renamed };
  }

  if (isJsonResume(payload)) {
    const name = payload.basics?.name ? `${payload.basics.name} (JSON Resume)` : file.name.replace(/\.json$/i, '');
    const resume = fromJsonResume(payload, name);
    await resumeDB.save(resume);
    return { kind: 'jsonResume', resume };
  }

  return { kind: 'unrecognised' };
}
