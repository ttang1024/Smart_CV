import type { Resume } from '../../types/resume';
import type { OptimizationSuggestion } from '../../types/ai';
import { richTextToPlainText } from '../../lib/richText';

/**
 * Apply an AI optimization suggestion to a resume. Returns the updated resume, or null
 * when the suggestion can't be located (e.g. the original text was edited since).
 */
export function applySuggestion(resume: Resume, suggestion: OptimizationSuggestion): Resume | null {
  const improved = suggestion.improvedText;
  const original = suggestion.originalText;
  if (!improved) return null;

  switch (suggestion.type) {
    case 'summary':
      return { ...resume, summary: improved };

    case 'experience': {
      if (!original) return null;
      const experience = resume.experience.map(exp => {
        if (richTextToPlainText(exp.description).includes(original)) {
          return { ...exp, description: improved };
        }
        const highlights = exp.highlights.map(h => (richTextToPlainText(h).includes(original) ? improved : h));
        return highlights.some((h, i) => h !== exp.highlights[i]) ? { ...exp, highlights } : exp;
      });
      return experience.some((e, i) => e !== resume.experience[i]) ? { ...resume, experience } : null;
    }

    case 'skills': {
      if (!original) return null;
      const skills = resume.skills.map(skill => {
        const categoryPrefix = skill.category ? `${skill.category}:` : null;
        const isMatch =
          skill.items.join(', ') === original ||
          (categoryPrefix !== null && original.startsWith(categoryPrefix));
        if (!isMatch) return skill;

        const content = categoryPrefix && improved.startsWith(categoryPrefix)
          ? improved.slice(categoryPrefix.length).trim()
          : improved;
        return { ...skill, items: content.split(',').map(s => s.trim()).filter(Boolean) };
      });
      return skills.some((s, i) => s !== resume.skills[i]) ? { ...resume, skills } : null;
    }

    default:
      return null;
  }
}
