import type {
	AIMessage,
	AIProviderType,
	OptimizationResult,
	OptimizationSuggestion,
} from '../../types/ai'
import type { Resume } from '../../types/resume'
import { richTextToPlainText } from '../../lib/richText'
import i18n from '../../i18n'

const API_BASE =
	process.env.NEXT_PUBLIC_API_URL ??
	(typeof window !== 'undefined' && window.location.port === '3000'
		? 'http://localhost:5167/api'
		: '/api')

interface ChatRequest {
	provider: AIProviderType
	apiKey: string
	model: string
	messages: AIMessage[]
	temperature?: number
	responseLanguage?: string
}

const RESPONSE_LANGUAGE_NAMES: Record<string, string> = {
	en: 'English',
	es: 'Spanish',
	'zh-CN': 'Simplified Chinese',
	'zh-TW': 'Traditional Chinese',
}

export async function chatWithAI(request: ChatRequest): Promise<string> {
	const response = await fetch(`${API_BASE}/ai/chat`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			provider: request.provider,
			apiKey: request.apiKey,
			model: request.model,
			messages: request.messages,
			temperature: request.temperature ?? 0.7,
			responseLanguage: request.responseLanguage ?? getSelectedResponseLanguage(),
		}),
	})

	if (!response.ok) {
		let errorMessage = `API error: ${response.status}`
		try {
			const err = await response.json()
			if (err?.detail) {
				try {
					const detail = JSON.parse(err.detail)
					errorMessage = detail?.error?.message ?? err.title ?? errorMessage
				} catch {
					errorMessage = err.title ?? err.detail ?? errorMessage
				}
			} else {
				errorMessage = err?.title ?? err?.error ?? errorMessage
			}
		} catch {
			// keep original message
		}
		throw new Error(errorMessage)
	}

	const data = await response.json()
	return data.content as string
}

function getSelectedResponseLanguage(): string {
	const language = i18n.resolvedLanguage ?? i18n.language ?? 'en'
	const code = Object.keys(RESPONSE_LANGUAGE_NAMES).find(
		supportedCode => language === supportedCode || language.startsWith(`${supportedCode}-`),
	) ?? 'en'

	return `${RESPONSE_LANGUAGE_NAMES[code]} (${code})`
}

export function buildOptimizationPrompt(resume: Resume, jobDescription: string): AIMessage[] {
	const resumeText = formatResumeAsText(resume)

	return [
		{
			role: 'system',
			content: `You are an expert resume writer and career coach specializing in ATS optimization.
Analyze resumes against job descriptions and provide precise, actionable improvements.
Always respond with valid JSON only — no markdown, no extra text.`,
		},
		{
			role: 'user',
			content: `Analyze this resume against the job description and return optimization suggestions in JSON.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Return this exact JSON structure:
{
  "matchScore": <0-100 integer>,
  "summary": "<2-3 sentence analysis>",
  "keywordMatches": ["<keyword1>", "<keyword2>"],
  "missingKeywords": ["<keyword1>", "<keyword2>"],
  "suggestions": [
    {
      "type": "<summary|experience|skills|education|projects|general|keywords>",
      "priority": "<high|medium|low>",
      "section": "<specific section name>",
      "issue": "<what is wrong or missing>",
      "suggestion": "<specific actionable advice>",
      "originalText": "<original text if applicable, omit if not>",
      "improvedText": "<improved version if applicable, omit if not>"
    }
  ]
}

Focus on:
1. ATS keyword matching
2. Quantifiable achievements
3. Relevant skills alignment
4. Formatting and clarity
5. Missing critical requirements

Return ONLY the JSON, no other text.`,
		},
	]
}

export async function optimizeResume(
	provider: AIProviderType,
	apiKey: string,
	model: string,
	resume: Resume,
	jobDescription: string,
): Promise<OptimizationResult> {
	const messages = buildOptimizationPrompt(resume, jobDescription)
	const content = await chatWithAI({ provider, apiKey, model, messages, temperature: 0.3 })

	let parsed: Omit<OptimizationResult, 'suggestions'> & {
		suggestions: Omit<OptimizationSuggestion, 'id' | 'applied'>[]
	}
	try {
		// Extract JSON from response (in case model adds extra text)
		const jsonMatch = content.match(/\{[\s\S]*\}/)
		if (!jsonMatch) throw new Error('No JSON found in response')
		parsed = JSON.parse(jsonMatch[0])
	} catch (e) {
		throw new Error(
			`Failed to parse AI response: ${e instanceof Error ? e.message : 'Unknown error'}`,
		)
	}

	return {
		matchScore: Math.min(100, Math.max(0, parsed.matchScore ?? 0)),
		summary: parsed.summary ?? '',
		keywordMatches: parsed.keywordMatches ?? [],
		missingKeywords: parsed.missingKeywords ?? [],
		suggestions: (parsed.suggestions ?? []).map((s, i) => ({
			...s,
			id: `suggestion-${i}-${Date.now()}`,
			applied: false,
		})),
	}
}

export async function improveSection(
	provider: AIProviderType,
	apiKey: string,
	model: string,
	sectionType: string,
	currentContent: string,
	jobDescription: string,
	instruction: string,
): Promise<string> {
	const messages: AIMessage[] = [
		{
			role: 'system',
			content:
				'You are an expert resume writer. Improve the provided resume section based on the job description and instructions. Return ONLY the improved text, no explanations.',
		},
		{
			role: 'user',
			content: `Section Type: ${sectionType}
Current Content:
${currentContent}

Job Description:
${jobDescription}

Instruction: ${instruction}

Return only the improved text:`,
		},
	]

	return chatWithAI({ provider, apiKey, model, messages, temperature: 0.5 })
}

export interface CoverLetterRequest {
	resume: Resume
	jobDescription: string
	jobTitle?: string
	company?: string
	hiringManager?: string
	tone?: 'professional' | 'warm' | 'confident' | 'concise'
}

export function buildCoverLetterPrompt({
	resume,
	jobDescription,
	jobTitle,
	company,
	hiringManager,
	tone = 'professional',
}: CoverLetterRequest): AIMessage[] {
	const resumeText = formatResumeAsText(resume)
	const targetLines = [
		jobTitle && `Job Title: ${jobTitle}`,
		company && `Company: ${company}`,
		hiringManager && `Hiring Manager: ${hiringManager}`,
		`Tone: ${tone}`,
	].filter(Boolean).join('\n')

	return [
		{
			role: 'system',
			content: `You are an expert career writer. Write tailored cover letters that are specific, credible, concise, and grounded only in the provided resume and job description.
Do not invent employers, credentials, degrees, metrics, or personal details.
Return only the finished cover letter text. Do not include markdown, explanations, placeholders, or analysis.`,
		},
		{
			role: 'user',
			content: `Generate a matching cover letter from this resume and job context.

TARGET ROLE:
${targetLines || 'Not specified'}

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Requirements:
- 250-380 words.
- Use a standard letter format with greeting, 3-4 concise paragraphs, and sign-off.
- If the hiring manager is missing, use "Dear Hiring Manager,".
- Mention the company and role when provided.
- Connect 2-3 strongest resume achievements or skills to the job requirements.
- Keep it natural and direct, not generic.
- Do not claim experience that is not supported by the resume.

Return only the cover letter.`,
		},
	]
}

export async function generateCoverLetter(
	provider: AIProviderType,
	apiKey: string,
	model: string,
	request: CoverLetterRequest,
): Promise<string> {
	const content = await chatWithAI({
		provider,
		apiKey,
		model,
		messages: buildCoverLetterPrompt(request),
		temperature: 0.55,
	})

	return content
		.replace(/^```(?:text|markdown)?/i, '')
		.replace(/```$/i, '')
		.trim()
}

function formatResumeAsText(resume: Resume): string {
	const lines: string[] = []
	const {
		personalInfo,
		summary,
		experience,
		education,
		skills,
		projects,
		certifications,
		languages,
	} = resume

	lines.push(`Name: ${personalInfo.fullName}`)
	if (personalInfo.title) lines.push(`Title: ${personalInfo.title}`)
	lines.push(`Email: ${personalInfo.email}`)
	if (personalInfo.phone) lines.push(`Phone: ${personalInfo.phone}`)
	if (personalInfo.location) lines.push(`Location: ${personalInfo.location}`)
	if (personalInfo.linkedin) lines.push(`LinkedIn: ${personalInfo.linkedin}`)
	if (personalInfo.github) lines.push(`GitHub: ${personalInfo.github}`)

	if (summary) {
		lines.push('\nSUMMARY:')
		lines.push(richTextToPlainText(summary))
	}

	if (experience.length > 0) {
		lines.push('\nEXPERIENCE:')
		experience.forEach(exp => {
			lines.push(
				`${exp.position} at ${exp.company} (${exp.startDate} - ${exp.current ? 'Present' : (exp.endDate ?? '')})`,
			)
			;(exp.productLinks ?? []).filter(Boolean).forEach(link => lines.push(`Product: ${link}`))
			if (exp.description) lines.push(richTextToPlainText(exp.description))
			exp.highlights.forEach(h => lines.push(`• ${richTextToPlainText(h)}`))
		})
	}

	if (education.length > 0) {
		lines.push('\nEDUCATION:')
		education.forEach(edu => {
			lines.push(
				`${edu.degree} in ${edu.field} - ${edu.institution} (${edu.startDate} - ${edu.current ? 'Present' : (edu.endDate ?? '')})`,
			)
			if (edu.gpa) lines.push(`GPA: ${edu.gpa}`)
		})
	}

	if (skills.length > 0) {
		lines.push('\nSKILLS:')
		skills.forEach(s => lines.push(`${s.category}: ${s.items.join(', ')}`))
	}

	if (projects.length > 0) {
		lines.push('\nPROJECTS:')
		projects.forEach(p => {
			lines.push(`${p.name}: ${richTextToPlainText(p.description)}`)
			if (p.technologies.length > 0) lines.push(`Technologies: ${p.technologies.join(', ')}`)
		})
	}

	if (certifications.length > 0) {
		lines.push('\nCERTIFICATIONS:')
		certifications.forEach(c => lines.push(`${c.name} - ${c.issuer} (${c.date})`))
	}

	if (languages.length > 0) {
		lines.push('\nLANGUAGES:')
		languages.forEach(l => lines.push(`${l.language}: ${l.proficiency}`))
	}

	return lines.join('\n')
}
