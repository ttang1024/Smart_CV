import { describe, expect, it } from 'vitest';
import { fromJsonResume, isJsonResume, toJsonResume, type JsonResume } from './jsonResume';
import { createEmptyResume } from '../store/resumeStore';
import type { Resume } from '../types/resume';

describe('isJsonResume', () => {
  it('recognizes a document with the JSON Resume $schema', () => {
    expect(isJsonResume({ $schema: 'https://jsonresume.org/schema' })).toBe(true);
  });

  it('recognizes a document with a "basics" or "work" key', () => {
    expect(isJsonResume({ basics: { name: 'A' } })).toBe(true);
    expect(isJsonResume({ work: [] })).toBe(true);
  });

  it('rejects a SmartCV-native resume (has personalInfo, not basics)', () => {
    expect(isJsonResume(createEmptyResume())).toBe(false);
  });

  it('rejects non-object values', () => {
    expect(isJsonResume(null)).toBe(false);
    expect(isJsonResume('a string')).toBe(false);
    expect(isJsonResume(42)).toBe(false);
  });
});

describe('toJsonResume', () => {
  it('maps personal info, links, and dates into the JSON Resume shape', () => {
    const resume: Resume = {
      ...createEmptyResume('Jane'),
      personalInfo: {
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        phone: '555-1234',
        location: 'Austin, TX',
        title: 'Engineer',
        website: 'https://jane.dev',
        linkedin: 'linkedin.com/in/janedoe',
        github: 'github.com/janedoe',
      },
      summary: 'Backend engineer.',
      experience: [{
        id: 'exp-1',
        company: 'Acme',
        position: 'Engineer',
        startDate: '2020-01',
        current: true,
        description: 'Owns the API.',
        highlights: ['Shipped v2 of the API.'],
      }],
    };

    const json = toJsonResume(resume);

    expect(json.basics?.name).toBe('Jane Doe');
    expect(json.basics?.email).toBe('jane@example.com');
    expect(json.basics?.location).toEqual({ address: 'Austin, TX' });
    expect(json.basics?.profiles).toEqual([
      { network: 'LinkedIn', url: 'linkedin.com/in/janedoe' },
      { network: 'GitHub', url: 'github.com/janedoe' },
    ]);

    const work = json.work?.[0];
    expect(work?.name).toBe('Acme');
    expect(work?.startDate).toBe('2020-01');
    // A currently-held role must not leak an endDate into the export.
    expect(work?.endDate).toBeUndefined();
    expect(work?.highlights).toEqual(['Shipped v2 of the API.']);
  });

  it('omits the endDate for education still in progress', () => {
    const resume: Resume = {
      ...createEmptyResume(),
      education: [{
        id: 'edu-1',
        institution: 'State University',
        degree: 'BSc',
        field: 'CS',
        startDate: '2020-09',
        endDate: '2024-06',
        current: true,
        gpa: '3.9',
      }],
    };

    const json = toJsonResume(resume);

    expect(json.education?.[0].endDate).toBeUndefined();
    expect(json.education?.[0].score).toBe('3.9');
  });
});

describe('fromJsonResume', () => {
  const minimal: JsonResume = {
    basics: {
      name: 'Jane Doe',
      email: 'jane@example.com',
      label: 'Engineer',
      location: { city: 'Austin', region: 'TX' },
      profiles: [
        { network: 'LinkedIn', url: 'linkedin.com/in/janedoe' },
        { network: 'GitHub', url: 'github.com/janedoe' },
      ],
    },
    work: [{ name: 'Acme', position: 'Engineer', startDate: '2020-01', highlights: ['Did things.'] }],
    education: [{ institution: 'State University', studyType: 'BSc', area: 'CS', startDate: '2016-09', endDate: '2020-06' }],
    skills: [{ name: 'Languages', keywords: ['Python', 'Go'] }],
    languages: [{ language: 'English', fluency: 'native' }],
  };

  it('builds a SmartCV resume with a fresh id and combined location', () => {
    const resume = fromJsonResume(minimal, 'Imported');

    expect(resume.id).toBeTruthy();
    expect(resume.name).toBe('Imported');
    expect(resume.personalInfo.fullName).toBe('Jane Doe');
    expect(resume.personalInfo.location).toBe('Austin, TX');
    expect(resume.personalInfo.linkedin).toBe('linkedin.com/in/janedoe');
    expect(resume.personalInfo.github).toBe('github.com/janedoe');
  });

  it('derives "current" from the absence of an endDate for work and education', () => {
    const resume = fromJsonResume(minimal);

    expect(resume.experience[0].current).toBe(true);
    expect(resume.education[0].current).toBe(false);
  });

  it('maps a lowercase fluency string to the SmartCV proficiency enum', () => {
    const resume = fromJsonResume(minimal);

    expect(resume.languages[0]).toMatchObject({ language: 'English', proficiency: 'Native' });
  });

  it('defaults an unrecognized fluency to Intermediate', () => {
    const resume = fromJsonResume({ languages: [{ language: 'French', fluency: 'some made-up level' }] });

    expect(resume.languages[0].proficiency).toBe('Intermediate');
  });

  it('tolerates a document with only a subset of fields populated', () => {
    const resume = fromJsonResume({});

    expect(resume.personalInfo.fullName).toBe('');
    expect(resume.experience).toEqual([]);
    expect(resume.education).toEqual([]);
    expect(resume.skills).toEqual([]);
  });

  it('round-trips personal info and work highlights through toJsonResume -> fromJsonResume', () => {
    const original = createEmptyResume('Round Trip');
    original.personalInfo = { fullName: 'Jane Doe', email: 'jane@example.com', phone: '', location: '', title: 'Engineer' };
    original.experience = [{
      id: 'exp-1', company: 'Acme', position: 'Engineer', startDate: '2020-01',
      current: false, endDate: '2022-01', description: '', highlights: ['Did the thing.'],
    }];

    const roundTripped = fromJsonResume(toJsonResume(original), original.name);

    expect(roundTripped.personalInfo.fullName).toBe(original.personalInfo.fullName);
    expect(roundTripped.personalInfo.email).toBe(original.personalInfo.email);
    expect(roundTripped.experience[0].company).toBe('Acme');
    expect(roundTripped.experience[0].highlights).toEqual(['Did the thing.']);
  });
});
