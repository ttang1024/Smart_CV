import { describe, expect, it } from 'vitest';
import { toResume } from './parsedResume';

describe('toResume', () => {
  it('maps the server parser casing (linkedIn / gitHub) and names the resume after the person', () => {
    const resume = toResume({ personalInfo: { fullName: 'Jane Smith', linkedIn: 'in/jane', gitHub: 'jane' } }, 'cv.pdf');

    expect(resume.name).toBe("Jane Smith's Resume");
    expect(resume.personalInfo.linkedin).toBe('in/jane');
    expect(resume.personalInfo.github).toBe('jane');
  });

  it('falls back to the file name and tolerates missing or malformed sections', () => {
    const resume = toResume({ experience: 'not-an-array', skills: [{ category: 'Lang', items: ['Go', 2] }] }, 'cv.pdf');

    expect(resume.name).toBe('cv');
    expect(resume.experience).toEqual([]);
    expect(resume.skills[0].items).toEqual(['Go', '2']);
  });

  it('drops the end date of a current role and normalises proficiency', () => {
    const resume = toResume({
      experience: [{ company: 'Acme', current: true, endDate: '2024-01' }],
      languages: [{ language: 'German', proficiency: 'Conversational' }],
    }, 'cv.pdf');

    expect(resume.experience[0].endDate).toBeUndefined();
    expect(resume.languages[0].proficiency).toBe('Intermediate');
  });
});
