import type { AIMessage, AIProviderType } from '../../types/ai'
import type { Resume } from '../../types/resume'
import { chatWithAI, formatResumeAsText } from './aiService'
import { parseAIJson } from '../../lib/aiJson'

export type FollowUpEmailType =
	| 'application-follow-up'
	| 'interview-thank-you'
	| 'status-inquiry'
	| 'referral-request'

export type FollowUpEmailTone = 'professional' | 'warm' | 'confident' | 'concise'

export interface FollowUpEmailRequest {
	resume: Resume
	emailType: FollowUpEmailType
	recipientName?: string
	jobTitle?: string
	company?: string
	jobDescription?: string
	/** Free-form notes, e.g. what was discussed in the interview or when the application was sent. */
	context?: string
	tone?: FollowUpEmailTone
}

export interface FollowUpEmail {
	subject: string
	body: string
}

const EMAIL_TYPE_BRIEFS: Record<FollowUpEmailType, string> = {
	'application-follow-up':
		'A follow-up email sent roughly 1-2 weeks after submitting a job application, politely restating interest and the strongest qualification match.',
	'interview-thank-you':
		'A thank-you email sent within 24 hours after an interview, thanking the interviewer, referencing something discussed, and reinforcing fit.',
	'status-inquiry':
		'A brief, courteous email asking about the current status of the application process after a period of silence.',
	'referral-request':
		'A networking email asking a contact at the company for a referral or a short conversation about an open role, grounded in genuine common interest.',
}

export function buildFollowUpEmailPrompt({
	resume,
	emailType,
	recipientName,
	jobTitle,
	company,
	jobDescription,
	context,
	tone = 'professional',
}: FollowUpEmailRequest): AIMessage[] {
	const targetLines = [
		recipientName && `Recipient: ${recipientName}`,
		jobTitle && `Job Title: ${jobTitle}`,
		company && `Company: ${company}`,
		`Tone: ${tone}`,
		context && `Extra context from the candidate:\n${context}`,
	].filter(Boolean).join('\n')

	return [
		{
			role: 'system',
			content: `You are an expert career writer. Write short, natural job-search emails that are specific, credible, and grounded only in the provided resume and context.
Do not invent employers, credentials, interview details, or personal facts.
Always respond with valid JSON only — no markdown, no extra text.`,
		},
		{
			role: 'user',
			content: `Write this job-search email for the candidate.

EMAIL TYPE:
${EMAIL_TYPE_BRIEFS[emailType]}

TARGET:
${targetLines || 'Not specified'}

RESUME:
${formatResumeAsText(resume)}

JOB DESCRIPTION:
${jobDescription?.trim() || 'Not provided'}

Return this exact JSON structure:
{
  "subject": "<concise, specific subject line>",
  "body": "<the full email body, 80-180 words, plain text with paragraphs separated by blank lines, greeting and sign-off included>"
}

Requirements:
- If the recipient name is missing, open with a sensible generic greeting.
- Reference the role and company when provided.
- Mention at most one concrete qualification or discussion point — these emails must stay short.
- No placeholders like [Company] or [Name]; omit what is unknown instead.
- Sign off with the candidate's name from the resume.

Return ONLY the JSON.`,
		},
	]
}

export async function generateFollowUpEmail(
	provider: AIProviderType,
	apiKey: string,
	model: string,
	request: FollowUpEmailRequest,
): Promise<FollowUpEmail> {
	const content = await chatWithAI({
		provider,
		apiKey,
		model,
		messages: buildFollowUpEmailPrompt(request),
		temperature: 0.55,
	})

	const parsed = parseAIJson<Partial<FollowUpEmail>>(content)
	return {
		subject: (parsed.subject ?? '').trim(),
		body: (parsed.body ?? '').trim(),
	}
}
