import { describe, expect, it } from 'vitest';
import { runAtsCheck } from './atsChecker';
import { createEmptyResume } from '../../store/resumeStore';
import type { Resume } from '../../types/resume';

function issueIds(result: ReturnType<typeof runAtsCheck>) {
  return result.issues.map(issue => issue.id);
}

function passIds(result: ReturnType<typeof runAtsCheck>) {
  return result.passed.map(issue => issue.id);
}

describe('runAtsCheck', () => {
  it('scores a fully empty resume as "At risk" with every core section flagged', () => {
    const result = runAtsCheck(createEmptyResume());

    expect(result.verdict).toBe('At risk');
    expect(result.score).toBeLessThan(50);
    expect(issueIds(result)).toEqual(expect.arrayContaining([
      'missing-name', 'missing-valid-email', 'missing-phone', 'missing-location',
      'missing-summary', 'missing-experience', 'missing-education', 'missing-skills',
      'too-short', 'few-sections', 'no-target-job',
    ]));
    expect(result.stats.missingCoreSections).toHaveLength(4);
  });

  it('scores a fully-populated, well-written resume as "Strong" with no critical issues', () => {
    const resume: Resume = {
      ...createEmptyResume('Jane Doe Resume'),
      personalInfo: {
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+1 555 123 4567',
        location: 'Austin, TX',
        title: 'Senior Backend Engineer',
        website: 'https://jane.dev',
        linkedin: 'linkedin.com/in/janedoe',
        github: 'github.com/janedoe',
      },
      summary:
        'Senior backend engineer with eight years of experience building scalable distributed ' +
        'systems for fintech and e-commerce platforms. Skilled in Python, Go, and cloud ' +
        'infrastructure, with a track record of leading cross-functional teams to ship reliable, ' +
        'high-performance products used by millions of customers worldwide.',
      experience: [
        {
          id: 'exp-1',
          company: 'Fintech Corp',
          position: 'Senior Backend Engineer',
          location: 'Austin, TX',
          startDate: '2021-01',
          current: true,
          description: 'Own the payments platform powering checkout for the company\'s core marketplace.',
          highlights: [
            'Led a team of 6 engineers to deliver a payments platform serving 2 million users.',
            'Reduced infrastructure costs by 35% through migrating to serverless architecture.',
            'Built an internal analytics dashboard adopted by 150 employees company-wide.',
            'Improved API latency by 40% by optimizing database queries and caching layers.',
          ],
        },
        {
          id: 'exp-2',
          company: 'Startup Inc',
          position: 'Backend Engineer',
          location: 'Remote',
          startDate: '2017-06',
          endDate: '2020-12',
          current: false,
          description: 'Built the initial version of the company\'s billing and subscription systems.',
          highlights: [
            'Designed a billing pipeline processing $5M in annual recurring revenue.',
            'Automated deployment pipelines, cutting release time from 2 hours to 15 minutes.',
          ],
        },
      ],
      education: [
        {
          id: 'edu-1',
          institution: 'University of Texas',
          degree: 'Bachelor of Science',
          field: 'Computer Science',
          startDate: '2013-09',
          endDate: '2017-05',
          current: false,
          gpa: '3.7/4.0',
        },
      ],
      skills: [
        { id: 'sk-1', category: 'Languages', items: ['Python', 'Go', 'TypeScript', 'SQL'] },
        { id: 'sk-2', category: 'Infrastructure', items: ['Docker', 'Kubernetes', 'AWS', 'Terraform'] },
      ],
      projects: [
        {
          id: 'proj-1',
          name: 'Open Source Rate Limiter',
          description: 'A distributed rate-limiting library adopted by several internal services to protect downstream APIs under load.',
          technologies: ['Go', 'Redis'],
          highlights: ['Adopted by 4 internal teams to prevent cascading outages during traffic spikes.'],
        },
      ],
      certifications: [
        { id: 'cert-1', name: 'AWS Certified Solutions Architect', issuer: 'Amazon Web Services', date: '2022-03' },
      ],
      targetJob: 'Senior Backend Engineer',
    };

    const result = runAtsCheck(resume);

    expect(result.verdict).toBe('Strong');
    expect(result.issues.filter(issue => issue.severity === 'critical')).toHaveLength(0);
    expect(passIds(result)).toEqual(expect.arrayContaining([
      'has-name', 'has-email', 'has-phone', 'core-sections-present',
      'metrics-present', 'action-verbs-present', 'skills-good', 'no-decorative-symbols',
    ]));
    expect(result.stats.missingCoreSections).toHaveLength(0);
  });

  it('flags bullets with low measurable impact when most lack numbers', () => {
    const resume: Resume = {
      ...createEmptyResume(),
      personalInfo: { fullName: 'A', email: 'a@example.com', phone: '', location: '' },
      experience: [{
        id: 'exp-1',
        company: 'Acme',
        position: 'Engineer',
        startDate: '2020-01',
        current: true,
        description: '',
        highlights: [
          'Helped the team ship a new feature.',
          'Worked closely with designers on the interface.',
          'Participated in on-call rotation for the platform.',
        ],
      }],
    };

    const result = runAtsCheck(resume);

    expect(issueIds(result)).toContain('low-metrics');
    expect(passIds(result)).not.toContain('metrics-present');
  });

  it('flags decorative symbols that can confuse ATS parsers', () => {
    const resume: Resume = {
      ...createEmptyResume(),
      summary: '★ Award-winning engineer ★ delivering results ✔ every sprint',
    };

    const result = runAtsCheck(resume);

    expect(issueIds(result)).toContain('decorative-symbols');
  });

  it('flags a website URL that does not look like a standard URL', () => {
    const resume: Resume = {
      ...createEmptyResume(),
      personalInfo: { fullName: 'A', email: 'a@example.com', phone: '', location: '', website: 'not a url at all' },
    };

    const result = runAtsCheck(resume);

    expect(issueIds(result)).toContain('malformed-urls');
  });
});
