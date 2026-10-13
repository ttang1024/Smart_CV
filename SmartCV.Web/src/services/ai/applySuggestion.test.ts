import { describe, expect, it } from 'vitest';
import { applySuggestion } from './applySuggestion';
import { createEmptyResume } from '../../store/resumeStore';
import type { OptimizationSuggestion } from '../../types/ai';

const suggestion = (overrides: Partial<OptimizationSuggestion>): OptimizationSuggestion => ({
  id: 's', type: 'summary', priority: 'high', section: '', issue: '', suggestion: '', applied: false, ...overrides,
});

const resume = {
  ...createEmptyResume(),
  summary: 'Old summary',
  experience: [{ id: 'e1', company: 'Acme', position: 'Dev', startDate: '2020', current: true, description: '', highlights: ['Built <b>things</b>'] }],
  skills: [{ id: 'k1', category: 'Languages', items: ['Go', 'C#'] }],
};

describe('applySuggestion', () => {
  it('replaces the summary', () => {
    expect(applySuggestion(resume, suggestion({ improvedText: 'New summary' }))?.summary).toBe('New summary');
  });

  it('replaces the matching experience highlight, comparing on plain text', () => {
    const updated = applySuggestion(resume, suggestion({ type: 'experience', originalText: 'Built things', improvedText: 'Shipped 3 products' }));

    expect(updated?.experience[0].highlights).toEqual(['Shipped 3 products']);
  });

  it('rewrites a skills category, accepting a "Category:" prefix', () => {
    const updated = applySuggestion(resume, suggestion({ type: 'skills', originalText: 'Languages: Go, C#', improvedText: 'Languages: Go, C#, TypeScript' }));

    expect(updated?.skills[0].items).toEqual(['Go', 'C#', 'TypeScript']);
  });

  it('returns null when the original text is no longer in the resume', () => {
    expect(applySuggestion(resume, suggestion({ type: 'experience', originalText: 'gone', improvedText: 'x' }))).toBeNull();
  });
});
