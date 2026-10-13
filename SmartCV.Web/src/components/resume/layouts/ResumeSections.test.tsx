import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../../../i18n';
import { hasSectionContent, ResumeSections } from './ResumeSections';
import { moveSection } from '../preview/useSectionDrag';
import { createEmptyResume } from '../../../store/resumeStore';
import type { Resume } from '../../../types/resume';

const resume: Resume = {
  ...createEmptyResume(),
  summary: 'About me',
  coreHighlights: [{ id: 'h', text: '<p><br></p>' }],
  skills: [{ id: 's', category: 'Lang', items: ['Go'] }],
  sectionOrder: ['skills', 'summary', 'coreHighlights', 'experience'],
  sectionTitles: { skills: 'Toolbox' },
};

describe('ResumeSections', () => {
  it('renders non-empty sections in the user order with custom titles', () => {
    render(
      <ResumeSections
        r={resume}
        bodies={{ summary: () => 'summary body', skills: () => 'skills body', coreHighlights: () => 'highlights', experience: () => 'exp' }}
        renderSection={(title, body) => <section><h2>{title}</h2>{body}</section>}
      />,
    );

    expect(screen.getAllByRole('heading').map(h => h.textContent)).toEqual(['Toolbox', 'Summary']);
  });

  it('treats highlights with only empty markup as empty', () => {
    expect(hasSectionContent(resume, 'coreHighlights')).toBe(false);
    expect(hasSectionContent(resume, 'experience')).toBe(false);
    expect(hasSectionContent(resume, 'skills')).toBe(true);
  });
});

describe('moveSection', () => {
  it('moves a section to the target position', () => {
    expect(moveSection(['summary', 'skills', 'experience'], 'experience', 'summary')).toEqual(['experience', 'summary', 'skills']);
  });

  it('returns the same order when either key is missing', () => {
    const order = ['summary' as const];
    expect(moveSection(order, 'skills', 'summary')).toBe(order);
  });
});
