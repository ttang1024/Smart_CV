import type { AIMessage, AIProviderType } from '../../types/ai'
import type { Resume } from '../../types/resume'
import { chatCached } from './chatClient'
import { formatResumeAsText } from './resumeFormatter'

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
