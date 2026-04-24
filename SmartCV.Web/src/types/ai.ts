export type AIProviderType =
	| 'openai'
	| 'gemini'
	| 'claude'
	| 'grok'
	| 'qianwen'
	| 'kimi'
	| 'doubao'
	| 'wenyanyixin'

export interface AIProviderConfig {
	type: AIProviderType
	name: string
	apiKey: string
	model: string
	defaultModel: string
	color: string
}

export interface AIMessage {
	role: 'system' | 'user' | 'assistant'
	content: string
}

export interface AIProviderSettings {
	apiKey: string
	model: string
}

export interface AISettings {
	activeProvider: AIProviderType
	providers: Record<AIProviderType, AIProviderSettings>
}

export interface OptimizationSuggestion {
	id: string
	type: 'summary' | 'experience' | 'skills' | 'education' | 'projects' | 'general' | 'keywords'
	priority: 'high' | 'medium' | 'low'
	section: string
	issue: string
	suggestion: string
	originalText?: string
	improvedText?: string
	applied: boolean
}

export interface OptimizationResult {
	matchScore: number
	summary: string
	keywordMatches: string[]
	missingKeywords: string[]
	suggestions: OptimizationSuggestion[]
}

export interface OptimizationSession {
	id: string
	resumeId: string
	jobDescription: string
	jobTitle?: string
	company?: string
	result: OptimizationResult
	createdAt: string
}

export const AI_PROVIDER_CONFIGS: Record<
	AIProviderType,
	Pick<AIProviderConfig, 'name' | 'defaultModel' | 'color'>
> = {
	openai: {
		name: 'OpenAI',
		color: '#10a37f',
		defaultModel: 'gpt-4o',
	},
	gemini: {
		name: 'Google Gemini',
		color: '#4285f4',
		defaultModel: 'gemini-2.5-pro',
	},
	claude: {
		name: 'Anthropic Claude',
		color: '#d4a853',
		defaultModel: 'claude-opus-4-6',
	},
	grok: {
		name: 'xAI Grok',
		color: '#1d9bf0',
		defaultModel: 'grok-3',
	},
	qianwen: {
		name: 'Qwen (Alibaba)',
		color: '#ff6a00',
		defaultModel: 'qwen-plus',
	},
	kimi: {
		name: 'Kimi (Moonshot)',
		color: '#6c5ce7',
		defaultModel: 'moonshot-v1-32k',
	},
	doubao: {
		name: 'Doubao (ByteDance)',
		color: '#00b4d8',
		defaultModel: 'doubao-pro-32k',
	},
	wenyanyixin: {
		name: 'Wenxin yiyan (Baidu)',
		color: '#2d6cdf',
		defaultModel: 'ernie-4.0-8k',
	},
}
