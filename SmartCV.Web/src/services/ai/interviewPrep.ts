import type { AIMessage, AIProviderType } from '../../types/ai'
import type { Resume } from '../../types/resume'
import { parseAIJson } from '../../lib/aiJson'
import { chatCached } from './chatClient'
import { formatResumeAsText } from './resumeFormatter'

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
