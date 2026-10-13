import { describe, expect, it } from 'vitest';
import { parseResume } from './resumeSchema';
import { createEmptyResume } from '../store/resumeStore';

describe('parseResume', () => {
  it('accepts a complete resume unchanged', () => {
    const resume = createEmptyResume('Valid');

    expect(parseResume(resume)).toEqual(resume);
  });

  it('fills missing collections from older backups with empty arrays', () => {
    const older: Partial<ReturnType<typeof createEmptyResume>> = createEmptyResume('Old');
    delete older.referees;
    delete older.achievements;

    const parsed = parseResume(older);

    expect(parsed.referees).toEqual([]);
    expect(parsed.achievements).toEqual([]);
  });

  it('coerces an unknown language proficiency instead of failing', () => {
    const resume = { ...createEmptyResume(), languages: [{ id: 'l1', language: 'French', proficiency: 'Conversational' }] };

    expect(parseResume(resume).languages[0].proficiency).toBe('Intermediate');
  });

  it('rejects data without an id or personal info', () => {
    const noId: Partial<ReturnType<typeof createEmptyResume>> = createEmptyResume();
    delete noId.id;

    expect(() => parseResume(noId)).toThrow();
    expect(() => parseResume({ ...createEmptyResume(), personalInfo: 'nope' })).toThrow();
  });
});
