import type { AIMessage, AIProviderType } from '../../types/ai'
import type { Resume, ResumeSection } from '../../types/resume'
import { chatWithAI } from './aiService'
import { parseAIJson } from '../../lib/aiJson'

/**
 * Subset of the resume containing only human-language text. IDs, dates,
 * emails, URLs, and enums never leave the browser-side scaffold, so the AI
 * cannot corrupt them — its output is merged back by array index.
 */
interface TranslatableContent {
	personalInfo?: { title?: string; location?: string }
	summary?: string
	coreHighlights?: string[]
	experience?: {
		position?: string
		company?: string
		location?: string
		description?: string
		highlights?: string[]
		projects?: { name?: string; description?: string; highlights?: string[] }[]
	}[]
	education?: {
		institution?: string
		degree?: string
		field?: string
		location?: string
		honors?: string
		description?: string
	}[]
	skills?: { category?: string; items?: string[] }[]
	projects?: { name?: string; description?: string; highlights?: string[] }[]
	certifications?: { name?: string; issuer?: string }[]
	languages?: string[]
	interests?: string[]
	achievements?: { title?: string; issuer?: string; description?: string }[]
	referees?: { title?: string; company?: string }[]
	sectionTitles?: Partial<Record<ResumeSection, string>>
	targetJob?: string
}

function extractTranslatable(resume: Resume): TranslatableContent {
	return {
		personalInfo: {
			title: resume.personalInfo.title,
			location: resume.personalInfo.location,
		},
		summary: resume.summary,
		coreHighlights: resume.coreHighlights.map(h => h.text),
		experience: resume.experience.map(exp => ({
			position: exp.position,
			company: exp.company,
			location: exp.location,
			description: exp.description,
			highlights: exp.highlights,
			projects: (exp.projects ?? []).map(project => ({
				name: project.name,
				description: project.description,
				highlights: project.highlights ?? [],
			})),
		})),
		education: resume.education.map(edu => ({
			institution: edu.institution,
			degree: edu.degree,
			field: edu.field,
			location: edu.location,
			honors: edu.honors,
			description: edu.description,
		})),
		skills: resume.skills.map(skill => ({
			category: skill.category,
			items: skill.items,
		})),
		projects: resume.projects.map(project => ({
			name: project.name,
			description: project.description,
			highlights: project.highlights,
		})),
		certifications: resume.certifications.map(cert => ({
			name: cert.name,
			issuer: cert.issuer,
		})),
		languages: resume.languages.map(lang => lang.language),
		interests: resume.interests.map(interest => interest.name),
		achievements: resume.achievements.map(achievement => ({
			title: achievement.title,
			issuer: achievement.issuer,
			description: achievement.description,
		})),
		referees: resume.referees.map(referee => ({
			title: referee.title,
			company: referee.company,
		})),
		sectionTitles: resume.sectionTitles,
		targetJob: resume.targetJob,
	}
}

/** Take the translated string when usable, otherwise keep the original. */
function tr(translated: string | undefined, original: string): string
function tr(translated: string | undefined, original: string | undefined): string | undefined
function tr(translated: string | undefined, original: string | undefined): string | undefined {
	if (!original || !original.trim()) return original
	return typeof translated === 'string' && translated.trim() ? translated : original
}

function trList(translated: string[] | undefined, original: string[]): string[] {
	return original.map((item, i) => tr(translated?.[i], item))
}

/**
 * Build a brand-new resume from `resume` with its text replaced by the
 * translation. The original resume is never mutated.
 */
function applyTranslation(resume: Resume, content: TranslatableContent, languageLabel: string): Resume {
	const copy = JSON.parse(JSON.stringify(resume)) as Resume
	const now = new Date().toISOString()

	copy.id = crypto.randomUUID()
	copy.name = `${resume.name} (${languageLabel})`
	copy.createdAt = now
	copy.updatedAt = now
	copy.baseResumeId = resume.baseResumeId ?? resume.id
	copy.jobApplicationId = undefined
	copy.versionLabel = languageLabel

	copy.personalInfo.title = tr(content.personalInfo?.title, copy.personalInfo.title)
	copy.personalInfo.location = tr(content.personalInfo?.location, copy.personalInfo.location)
	copy.summary = tr(content.summary, copy.summary)
	copy.targetJob = tr(content.targetJob, copy.targetJob)

	copy.coreHighlights.forEach((highlight, i) => {
		highlight.text = tr(content.coreHighlights?.[i], highlight.text)
	})

	copy.experience.forEach((exp, i) => {
		const t = content.experience?.[i]
		exp.position = tr(t?.position, exp.position)
		exp.company = tr(t?.company, exp.company)
		exp.location = tr(t?.location, exp.location)
		exp.description = tr(t?.description, exp.description)
		exp.highlights = trList(t?.highlights, exp.highlights)
		;(exp.projects ?? []).forEach((project, j) => {
			const tp = t?.projects?.[j]
			project.name = tr(tp?.name, project.name)
			project.description = tr(tp?.description, project.description)
			if (project.highlights) project.highlights = trList(tp?.highlights, project.highlights)
		})
	})

	copy.education.forEach((edu, i) => {
		const t = content.education?.[i]
		edu.institution = tr(t?.institution, edu.institution)
		edu.degree = tr(t?.degree, edu.degree)
		edu.field = tr(t?.field, edu.field)
		edu.location = tr(t?.location, edu.location)
		edu.honors = tr(t?.honors, edu.honors)
		edu.description = tr(t?.description, edu.description)
	})

	copy.skills.forEach((skill, i) => {
		const t = content.skills?.[i]
		skill.category = tr(t?.category, skill.category)
		skill.items = trList(t?.items, skill.items)
	})

	copy.projects.forEach((project, i) => {
		const t = content.projects?.[i]
		project.name = tr(t?.name, project.name)
		project.description = tr(t?.description, project.description)
		project.highlights = trList(t?.highlights, project.highlights)
	})

	copy.certifications.forEach((cert, i) => {
		const t = content.certifications?.[i]
		cert.name = tr(t?.name, cert.name)
		cert.issuer = tr(t?.issuer, cert.issuer)
	})

	copy.languages.forEach((lang, i) => {
		lang.language = tr(content.languages?.[i], lang.language)
	})

	copy.interests.forEach((interest, i) => {
		interest.name = tr(content.interests?.[i], interest.name)
	})

	copy.achievements.forEach((achievement, i) => {
		const t = content.achievements?.[i]
		achievement.title = tr(t?.title, achievement.title)
		achievement.issuer = tr(t?.issuer, achievement.issuer)
		achievement.description = tr(t?.description, achievement.description)
	})

	copy.referees.forEach((referee, i) => {
		const t = content.referees?.[i]
		referee.title = tr(t?.title, referee.title)
		referee.company = tr(t?.company, referee.company)
	})

	if (copy.sectionTitles) {
		for (const key of Object.keys(copy.sectionTitles) as ResumeSection[]) {
			copy.sectionTitles[key] = tr(content.sectionTitles?.[key], copy.sectionTitles[key])
		}
	}

	return copy
}

export function buildTranslationPrompt(resume: Resume, targetLanguage: string): AIMessage[] {
	const payload = extractTranslatable(resume)

	return [
		{
			role: 'system',
			content: `You are a professional resume translator and localizer. Translate resume content so it reads as if originally written by a native professional in the target language.
Rules:
- Return valid JSON only — no markdown, no extra text.
- Keep the exact same JSON structure, keys, array lengths, and array order as the input.
- Preserve any inline HTML tags (such as <b>, <i>, <u>, <ul>, <li>, <br>) exactly; translate only the text between them.
- Do not translate or alter email addresses, URLs, phone numbers, dates, or numbers.
- Keep technical terms, programming languages, and tools in the form professionals in the target language actually use (usually English, e.g. "Python", "Kubernetes").
- Keep official certification names in their original language; the issuer may be localized if a standard localized name exists.
- Keep company, product, and institution names unless a well-established localized name exists.
- Use the wording, tone, and resume conventions natural to the target language.`,
		},
		{
			role: 'user',
			content: `Translate every string value in this resume content to ${targetLanguage}.

RESUME CONTENT (JSON):
${JSON.stringify(payload, null, 2)}

Return ONLY the translated JSON with the identical structure.`,
		},
	]
}

export interface TranslateResumeRequest {
	resume: Resume
	/** English name of the target language, e.g. "Japanese". Used in the prompt. */
	targetLanguage: string
	/** Short label appended to the new resume's name, e.g. "日本語". */
	languageLabel: string
}

export async function translateResume(
	provider: AIProviderType,
	apiKey: string,
	model: string,
	{ resume, targetLanguage, languageLabel }: TranslateResumeRequest,
): Promise<Resume> {
	const content = await chatWithAI({
		provider,
		apiKey,
		model,
		messages: buildTranslationPrompt(resume, targetLanguage),
		temperature: 0.2,
		// Override the UI-language default so the backend never asks the model
		// to answer in a language other than the translation target.
		responseLanguage: targetLanguage,
	})

	const parsed = parseAIJson<TranslatableContent>(content)
	return applyTranslation(resume, parsed, languageLabel)
}
