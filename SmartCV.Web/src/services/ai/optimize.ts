import type {
	AIMessage,
	AIProviderType,
	OptimizationResult,
	OptimizationSuggestion,
} from '../../types/ai'
import type { Resume } from '../../types/resume'
import { parseAIJson } from '../../lib/aiJson'
import { chatCached } from './chatClient'
import { formatResumeAsText } from './resumeFormatter'

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
