import type {
	AIMessage,
	AIProviderType,
	OptimizationResult,
	OptimizationSuggestion,
} from '../../types/ai'
import type { Resume } from '../../types/resume'
import { richTextToPlainText } from '../../lib/richText'
import { parseAIJson } from '../../lib/aiJson'
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

/**
 * In-session dedupe cache. Identical generation requests (same provider, model,
 * messages, temperature, and response language) resolve from memory instead of
 * re-billing the user — e.g. toggling a panel closed and open, or hitting
 * "Regenerate" without changing any inputs. Cleared on full page reload.
 */
const responseCache = new Map<string, string>()
const MAX_CACHED_RESPONSES = 40

function cacheSignature(request: ChatRequest): string {
	return JSON.stringify({
		provider: request.provider,
		model: request.model,
		messages: request.messages,
		temperature: request.temperature ?? 0.7,
		responseLanguage: request.responseLanguage ?? getSelectedResponseLanguage(),
	})
}

async function chatCached(request: ChatRequest): Promise<string> {
	const key = cacheSignature(request)
	const cached = responseCache.get(key)
	if (cached !== undefined) return cached

	const content = await chatWithAI(request)
	if (responseCache.size >= MAX_CACHED_RESPONSES) {
		const oldest = responseCache.keys().next().value
		if (oldest !== undefined) responseCache.delete(oldest)
	}
	responseCache.set(key, content)
	return content
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
	const content = await chatCached({ provider, apiKey, model, messages, temperature: 0.3 })

	const parsed = parseAIJson<Omit<OptimizationResult, 'suggestions'> & {
		suggestions: Omit<OptimizationSuggestion, 'id' | 'applied'>[]
	}>(content)

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
	const content = await chatCached({
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

export interface InterviewPrepRequest {
	resume: Resume
	jobDescription?: string
	jobTitle?: string
	company?: string
	questions: string[]
	starStoryCount?: number
}

export interface InterviewAnswer {
	question: string
	answer: string
	keyPoints: string[]
}

export interface StarStory {
	title: string
	competency: string
	situation: string
	task: string
	action: string
	result: string
	bestForQuestions: string[]
}

export interface InterviewPrepResult {
	answers: InterviewAnswer[]
	starStories: StarStory[]
}

export function buildInterviewPrepPrompt({
	resume,
	jobDescription,
	jobTitle,
	company,
	questions,
	starStoryCount = 4,
}: InterviewPrepRequest): AIMessage[] {
	const resumeText = formatResumeAsText(resume)
	const targetLines = [
		jobTitle && `Job Title: ${jobTitle}`,
		company && `Company: ${company}`,
		jobDescription && `Job Description:\n${jobDescription}`,
	].filter(Boolean).join('\n\n')

	return [
		{
			role: 'system',
			content: `You are an expert interview coach. Create interview answers and STAR stories that are specific, credible, concise, and grounded only in the provided resume and job context.
Do not invent employers, credentials, degrees, metrics, or personal details.
Always respond with valid JSON only. Do not include markdown or explanations outside JSON.`,
		},
		{
			role: 'user',
			content: `Generate interview preparation material from this resume.

TARGET ROLE:
${targetLines || 'Not specified'}

RESUME:
${resumeText}

INTERVIEW QUESTIONS:
${questions.length > 0 ? questions.map((question, index) => `${index + 1}. ${question}`).join('\n') : 'No specific questions provided. Generate STAR stories only.'}

Return this exact JSON structure:
{
  "answers": [
    {
      "question": "<question>",
      "answer": "<90-150 word answer in first person>",
      "keyPoints": ["<short point>", "<short point>", "<short point>"]
    }
  ],
  "starStories": [
    {
      "title": "<short story label>",
      "competency": "<leadership|problem solving|technical delivery|stakeholder management|conflict|learning|ownership|other>",
      "situation": "<specific situation grounded in resume>",
      "task": "<what needed to be done>",
      "action": "<what I did>",
      "result": "<outcome grounded in resume evidence>",
      "bestForQuestions": ["<question this story can answer>", "<another question>"]
    }
  ]
}

Requirements:
- Create answers only for the provided questions.
- Create ${starStoryCount} STAR stories.
- Keep each STAR field to 1-2 sentences.
- Use first person where natural.
- If a metric is not present in the resume, describe the result without a made-up number.
- Make the answers suitable for spoken interview delivery.

Return ONLY the JSON.`,
		},
	]
}

export async function generateInterviewPrep(
	provider: AIProviderType,
	apiKey: string,
	model: string,
	request: InterviewPrepRequest,
): Promise<InterviewPrepResult> {
	const content = await chatCached({
		provider,
		apiKey,
		model,
		messages: buildInterviewPrepPrompt(request),
		temperature: 0.45,
	})

	const parsed = parseAIJson<Partial<InterviewPrepResult>>(content)

	return {
		answers: (parsed.answers ?? []).map(answer => ({
			question: answer.question ?? '',
			answer: answer.answer ?? '',
			keyPoints: Array.isArray(answer.keyPoints) ? answer.keyPoints : [],
		})),
		starStories: (parsed.starStories ?? []).map(story => ({
			title: story.title ?? '',
			competency: story.competency ?? 'other',
			situation: story.situation ?? '',
			task: story.task ?? '',
			action: story.action ?? '',
			result: story.result ?? '',
			bestForQuestions: Array.isArray(story.bestForQuestions) ? story.bestForQuestions : [],
		})),
	}
}

// ── Mock Interview (interactive practice) ───────────────────────────────────

export interface MockInterviewConfig {
	resume: Resume
	jobTitle?: string
	company?: string
	jobDescription?: string
	focus?: 'mixed' | 'behavioral' | 'technical'
	difficulty?: 'gentle' | 'standard' | 'tough'
}

export interface MockInterviewTurn {
	question: string
	answer: string
}

export interface MockAnswerEvaluation {
	score: number // 0-100
	verdict: string // one-line summary
	strengths: string[]
	improvements: string[]
	modelAnswer: string
	followUp: string // the interviewer's next question
}

function buildMockContext({ jobTitle, company, jobDescription, focus = 'mixed', difficulty = 'standard' }: MockInterviewConfig): string {
	return [
		jobTitle && `Job Title: ${jobTitle}`,
		company && `Company: ${company}`,
		`Focus: ${focus}`,
		`Difficulty: ${difficulty}`,
		jobDescription && `Job Description:\n${jobDescription}`,
	].filter(Boolean).join('\n')
}

/**
 * Ask the AI interviewer for the opening question of a mock interview.
 */
export async function startMockInterview(
	provider: AIProviderType,
	apiKey: string,
	model: string,
	config: MockInterviewConfig,
): Promise<string> {
	const messages: AIMessage[] = [
		{
			role: 'system',
			content: `You are a realistic but fair interviewer running a live mock interview. Ask one question at a time. Keep questions grounded in the candidate's resume and the target role. Return ONLY the question text, with no preamble, numbering, or quotation marks.`,
		},
		{
			role: 'user',
			content: `Start a mock interview.

TARGET ROLE / SETTINGS:
${buildMockContext(config)}

RESUME:
${formatResumeAsText(config.resume)}

Ask your first interview question now. Return only the question.`,
		},
	]

	const content = await chatWithAI({ provider, apiKey, model, messages, temperature: 0.6 })
	return content.replace(/^["'\s]+|["'\s]+$/g, '').trim()
}

/**
 * Evaluate the candidate's spoken answer, then produce the next question.
 * Returns structured feedback rendered as a scorecard in the panel.
 */
export async function evaluateMockAnswer(
	provider: AIProviderType,
	apiKey: string,
	model: string,
	config: MockInterviewConfig,
	history: MockInterviewTurn[],
	currentQuestion: string,
	answer: string,
): Promise<MockAnswerEvaluation> {
	const transcript = history.length > 0
		? history.map((turn, index) => `Q${index + 1}: ${turn.question}\nA${index + 1}: ${turn.answer}`).join('\n\n')
		: 'No previous turns.'

	const messages: AIMessage[] = [
		{
			role: 'system',
			content: `You are an expert interview coach evaluating a candidate's answer in a live mock interview.
Score fairly and give specific, actionable feedback grounded only in the candidate's resume and answer.
Do not invent achievements. Always respond with valid JSON only — no markdown, no extra text.`,
		},
		{
			role: 'user',
			content: `Evaluate the candidate's latest answer and ask a natural follow-up question.

TARGET ROLE / SETTINGS:
${buildMockContext(config)}

RESUME:
${formatResumeAsText(config.resume)}

EARLIER TRANSCRIPT:
${transcript}

CURRENT QUESTION:
${currentQuestion}

CANDIDATE ANSWER:
${answer}

Return this exact JSON structure:
{
  "score": <0-100 integer for this answer>,
  "verdict": "<one concise sentence assessment>",
  "strengths": ["<specific strength>", "<specific strength>"],
  "improvements": ["<specific, actionable fix>", "<specific, actionable fix>"],
  "modelAnswer": "<a strong 60-120 word example answer grounded in the resume>",
  "followUp": "<the next interview question, building on the conversation>"
}

Return ONLY the JSON.`,
		},
	]

	const content = await chatWithAI({ provider, apiKey, model, messages, temperature: 0.4 })
	const parsed = parseAIJson<Partial<MockAnswerEvaluation>>(content)

	return {
		score: Math.min(100, Math.max(0, Math.round(parsed.score ?? 0))),
		verdict: parsed.verdict ?? '',
		strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
		improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
		modelAnswer: parsed.modelAnswer ?? '',
		followUp: parsed.followUp ?? '',
	}
}

export function formatResumeAsText(resume: Resume): string {
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
			;(exp.projects ?? [])
				.filter(project => project.name || project.url || project.description || (project.highlights ?? []).some(Boolean))
				.forEach(project => {
					lines.push(`Project: ${project.name}${project.url ? ` (${project.url})` : ''}`)
					if (project.description) lines.push(richTextToPlainText(project.description))
					;(project.highlights ?? []).forEach(h => lines.push(`• ${richTextToPlainText(h)}`))
				})
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
