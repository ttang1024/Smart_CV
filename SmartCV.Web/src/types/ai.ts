export type AIProviderType =
	| 'openai'
	| 'gemini'
	| 'claude'
	| 'grok'
	| 'deepseek'
	| 'qianwen'
	| 'kimi'
	| 'doubao'
	| 'wenyanyixin'

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
	useAI: boolean
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

export interface AIProviderMeta {
	name: string
	color: string
	defaultModel: string
	modelHint: string
	/** Shown in Settings. Hidden providers stay supported by the API proxy. */
	listed: boolean
}

/**
 * Client-side provider registry: display metadata and default models. The upstream
 * endpoints live server-side only (SmartCV.API/Services/AiProviders.cs).
 */
export const AI_PROVIDER_CONFIGS: Record<AIProviderType, AIProviderMeta> = {
	openai: {
		name: 'OpenAI',
		color: '#10a37f',
		defaultModel: 'gpt-4o',
		modelHint: 'e.g. gpt-4o, gpt-4o-mini, o1',
		listed: true,
	},
	gemini: {
		name: 'Google Gemini',
		color: '#4285f4',
		defaultModel: 'gemini-2.5-pro',
		modelHint: 'e.g. gemini-2.5-pro, gemini-2.5-flash',
		listed: true,
	},
	claude: {
		name: 'Anthropic Claude',
		color: '#d4a853',
		defaultModel: 'claude-opus-5-5',
		modelHint: 'e.g. claude-opus-5-5, claude-sonnet-5-5, claude-haiku-5-5',
		listed: true,
	},
	grok: {
		name: 'xAI Grok',
		color: '#1d9bf0',
		defaultModel: 'grok-3',
		modelHint: 'e.g. grok-3, grok-3-mini',
		listed: true,
	},
	deepseek: {
		name: 'DeepSeek',
		color: '#4d6bfe',
		defaultModel: 'deepseek-v4-flash',
		modelHint: 'e.g. deepseek-v4-flash, deepseek-v4-pro, deepseek-reasoner',
		listed: true,
	},
	qianwen: {
		name: 'Qwen (Alibaba)',
		color: '#ff6a00',
		defaultModel: 'qwen-plus',
		modelHint: 'e.g. qwen-plus, qwen-max, qwen-turbo',
		listed: true,
	},
	kimi: {
		name: 'Kimi (Moonshot)',
		color: '#6c5ce7',
		defaultModel: 'moonshot-v1-32k',
		modelHint: 'e.g. moonshot-v1-32k, moonshot-v1-128k, kimi-k2-0711-preview',
		listed: false,
	},
	doubao: {
		name: 'Doubao (ByteDance)',
		color: '#00b4d8',
		defaultModel: 'doubao-pro-32k',
		modelHint: 'e.g. doubao-pro-32k, doubao-lite-32k',
		listed: false,
	},
	wenyanyixin: {
		name: 'Wenxin yiyan (Baidu)',
		color: '#2d6cdf',
		defaultModel: 'ernie-4.0-8k',
		modelHint: 'e.g. ernie-4.0-8k, ernie-speed-128k',
		listed: false,
	},
}

export const AI_PROVIDER_IDS = Object.keys(AI_PROVIDER_CONFIGS) as AIProviderType[]
