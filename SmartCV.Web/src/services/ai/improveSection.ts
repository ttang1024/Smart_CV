import type { AIMessage, AIProviderType } from '../../types/ai'
import { chatWithAI } from './chatClient'

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
