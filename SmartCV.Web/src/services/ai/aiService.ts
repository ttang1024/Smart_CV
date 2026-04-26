import type {
	AIMessage,
	AIProviderType,
	OptimizationResult,
	OptimizationSuggestion,
} from '../../types/ai'
import type { Resume } from '../../types/resume'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

interface ChatRequest {
	provider: AIProviderType
	apiKey: string
	model: string
	messages: AIMessage[]
	temperature?: number
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
		}),
	})

	if (!response.ok) {
		let errorMessage = `API error: ${response.status}`
		try {
			const err = await response.json()
			errorMessage = err?.detail ?? err?.error ?? errorMessage
		} catch {
			// keep original message
		}
		throw new Error(errorMessage)
	}

	const data = await response.json()
	return data.content as string
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
		lines.push(summary)
	}

	if (experience.length > 0) {
		lines.push('\nEXPERIENCE:')
		experience.forEach(exp => {
			lines.push(
				`${exp.position} at ${exp.company} (${exp.startDate} - ${exp.current ? 'Present' : (exp.endDate ?? '')})`,
			)
			if (exp.description) lines.push(exp.description)
			exp.highlights.forEach(h => lines.push(`• ${h}`))
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
			lines.push(`${p.name}: ${p.description}`)
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
