import type { AIMessage, AIProviderType } from '../../types/ai'
import type { Resume } from '../../types/resume'
import { chatWithAI } from './aiService'
import { parseAIJson } from '../../lib/aiJson'
import { sanitizeRichText } from '../../lib/richText'

/**
 * Each proofreadable field is addressed by a stable path key (e.g.
 * "experience[0].highlights[2]"). The AI only ever sees and returns these
 * keys plus corrected text; corrections are applied by path, so a confused
 * model can at worst skip a fix — never write to the wrong place.
 */
export interface ProofreadField {
	key: string
	label: string
	text: string
}

export type ProofreadCategory = 'spelling' | 'grammar' | 'punctuation' | 'consistency' | 'clarity'
export type ProofreadSeverity = 'error' | 'warning' | 'suggestion'

export interface ProofreadIssue {
	id: string
	fieldKey: string
	fieldLabel: string
	category: ProofreadCategory
	severity: ProofreadSeverity
	explanation: string
	originalText: string
	correctedText: string
}

export function collectProofreadFields(resume: Resume): ProofreadField[] {
	const fields: ProofreadField[] = []
	const add = (key: string, label: string, text: string | undefined) => {
		if (text && text.trim()) fields.push({ key, label, text })
	}

	add('personalInfo.title', 'Professional title', resume.personalInfo.title)
	add('summary', 'Summary', resume.summary)
	resume.coreHighlights.forEach((highlight, i) =>
		add(`coreHighlights[${i}].text`, `Core highlight ${i + 1}`, highlight.text))
	resume.experience.forEach((exp, i) => {
		const where = exp.company || `Experience ${i + 1}`
		add(`experience[${i}].position`, `${where} — position`, exp.position)
		add(`experience[${i}].description`, `${where} — description`, exp.description)
		exp.highlights.forEach((h, j) =>
			add(`experience[${i}].highlights[${j}]`, `${where} — bullet ${j + 1}`, h))
	})
	resume.education.forEach((edu, i) => {
		const where = edu.institution || `Education ${i + 1}`
		add(`education[${i}].degree`, `${where} — degree`, edu.degree)
		add(`education[${i}].field`, `${where} — field`, edu.field)
		add(`education[${i}].honors`, `${where} — honors`, edu.honors)
		add(`education[${i}].description`, `${where} — description`, edu.description)
	})
	resume.skills.forEach((skill, i) =>
		add(`skills[${i}].category`, `Skill category ${i + 1}`, skill.category))
	resume.projects.forEach((project, i) => {
		const where = project.name || `Project ${i + 1}`
		add(`projects[${i}].name`, `${where} — name`, project.name)
		add(`projects[${i}].description`, `${where} — description`, project.description)
		project.highlights.forEach((h, j) =>
			add(`projects[${i}].highlights[${j}]`, `${where} — bullet ${j + 1}`, h))
	})
	resume.achievements.forEach((achievement, i) => {
		const where = achievement.title || `Achievement ${i + 1}`
		add(`achievements[${i}].title`, `${where} — title`, achievement.title)
		add(`achievements[${i}].description`, `${where} — description`, achievement.description)
	})

	return fields
}

export function buildProofreadPrompt(fields: ProofreadField[]): AIMessage[] {
	return [
		{
			role: 'system',
			content: `You are a meticulous resume proofreader. Find objective writing problems: spelling mistakes, grammar errors, punctuation issues, inconsistencies (tense, capitalization, date or bullet style), and unclear phrasing.
Do not rewrite content for impact, change meaning, or invent achievements — fix only what is wrong.
Some field text contains HTML tags; preserve all tags exactly and fix only the human-readable text between them.
Always respond with valid JSON only — no markdown, no extra text.`,
		},
		{
			role: 'user',
			content: `Proofread these resume fields. Each field has a stable "key" — return it unchanged with your correction.

FIELDS (JSON):
${JSON.stringify(fields.map(({ key, text }) => ({ key, text })), null, 2)}

Return this exact JSON structure:
{
  "issues": [
    {
      "fieldKey": "<key copied exactly from the input>",
      "category": "<spelling|grammar|punctuation|consistency|clarity>",
      "severity": "<error|warning|suggestion>",
      "explanation": "<one short sentence: what is wrong and why>",
      "correctedText": "<the COMPLETE corrected text for that field, preserving any HTML tags>"
    }
  ]
}

Requirements:
- Report only fields that actually have a problem; a perfect resume returns an empty issues array.
- One issue per field: if a field has several problems, fix them all in one correctedText.
- correctedText must be the full replacement for the field, not a fragment.
- severity: "error" for spelling/grammar mistakes, "warning" for inconsistencies, "suggestion" for clarity improvements.

Return ONLY the JSON.`,
		},
	]
}

const VALID_CATEGORIES: ProofreadCategory[] = ['spelling', 'grammar', 'punctuation', 'consistency', 'clarity']
const VALID_SEVERITIES: ProofreadSeverity[] = ['error', 'warning', 'suggestion']

export async function proofreadResume(
	provider: AIProviderType,
	apiKey: string,
	model: string,
	resume: Resume,
): Promise<ProofreadIssue[]> {
	const fields = collectProofreadFields(resume)
	if (fields.length === 0) return []

	const content = await chatWithAI({
		provider,
		apiKey,
		model,
		messages: buildProofreadPrompt(fields),
		temperature: 0.1,
	})

	const parsed = parseAIJson<{ issues?: Partial<ProofreadIssue>[] }>(content)
	const fieldsByKey = new Map(fields.map(field => [field.key, field]))

	return (parsed.issues ?? []).flatMap((issue, i) => {
		const field = issue.fieldKey ? fieldsByKey.get(issue.fieldKey) : undefined
		const correctedText = (issue.correctedText ?? '').trim()
		// Drop hallucinated keys and no-op "fixes".
		if (!field || !correctedText || correctedText === field.text) return []
		return [{
			id: `proofread-${i}-${Date.now()}`,
			fieldKey: field.key,
			fieldLabel: field.label,
			category: VALID_CATEGORIES.includes(issue.category as ProofreadCategory)
				? (issue.category as ProofreadCategory)
				: 'grammar',
			severity: VALID_SEVERITIES.includes(issue.severity as ProofreadSeverity)
				? (issue.severity as ProofreadSeverity)
				: 'warning',
			explanation: issue.explanation ?? '',
			originalText: field.text,
			correctedText,
		}]
	})
}

/**
 * Apply one correction by field path, returning a new resume or null when the
 * path no longer resolves to a string (e.g. the entry was deleted meanwhile).
 */
export function applyFieldCorrection(resume: Resume, fieldKey: string, correctedText: string): Resume | null {
	const segments = fieldKey.match(/[^.[\]]+/g)
	if (!segments || segments.length === 0) return null

	const copy = JSON.parse(JSON.stringify(resume)) as Resume
	let node: unknown = copy
	for (const segment of segments.slice(0, -1)) {
		if (typeof node !== 'object' || node === null) return null
		node = (node as Record<string, unknown>)[segment]
	}

	const last = segments[segments.length - 1]
	if (typeof node !== 'object' || node === null) return null
	const parent = node as Record<string, unknown>
	if (typeof parent[last] !== 'string') return null

	parent[last] = correctedText.includes('<') ? sanitizeRichText(correctedText) : correctedText
	return copy
}
