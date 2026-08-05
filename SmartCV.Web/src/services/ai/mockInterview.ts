import type { AIMessage, AIProviderType } from '../../types/ai'
import type { Resume } from '../../types/resume'
import { parseAIJson } from '../../lib/aiJson'
import { chatWithAI } from './chatClient'
import { formatResumeAsText } from './resumeFormatter'

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
