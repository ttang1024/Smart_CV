import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { importResumeFile } from './resumeBackup';
import { resumeDB } from './storage/indexedDB';
import { createEmptyResume } from '../store/resumeStore';

const jsonFile = (data: unknown, name = 'backup.json') => new File([JSON.stringify(data)], name, { type: 'application/json' });

describe('importResumeFile', () => {
  it('imports a SmartCV backup and skips invalid entries', async () => {
    const valid = createEmptyResume('From backup');

    const result = await importResumeFile(jsonFile({ app: 'SmartCV', resumes: [valid, { nonsense: true }] }));

    expect(result).toEqual({ kind: 'backup', imported: 1, skipped: 1, renamed: 0 });
    expect((await resumeDB.get(valid.id))?.name).toBe('From backup');
  });

  it('gives a colliding resume a new id instead of overwriting the existing one', async () => {
    const existing = createEmptyResume('Keep me');
    await resumeDB.save(existing);

    const result = await importResumeFile(jsonFile({ app: 'SmartCV', resumes: [{ ...existing, name: 'Imported copy' }] }));

    expect(result).toMatchObject({ kind: 'backup', imported: 1, renamed: 1 });
    expect((await resumeDB.get(existing.id))?.name).toBe('Keep me');
    expect((await resumeDB.getAll()).some(r => r.name === 'Imported copy' && r.id !== existing.id)).toBe(true);
  });

  it('imports a JSON Resume file', async () => {
    const result = await importResumeFile(jsonFile({ basics: { name: 'Ada Lovelace' } }, 'ada.json'));

    expect(result.kind).toBe('jsonResume');
    if (result.kind === 'jsonResume') expect(result.resume.personalInfo.fullName).toBe('Ada Lovelace');
  });

  it('reports files it does not recognise', async () => {
    expect(await importResumeFile(jsonFile({ hello: 'world' }))).toEqual({ kind: 'unrecognised' });
  });
});
