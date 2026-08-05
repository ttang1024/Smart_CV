import type { AIMessage, AIProviderType } from '../../types/ai'
import i18n from '../../i18n'

const API_BASE =
	process.env.NEXT_PUBLIC_API_URL ??
	(typeof window !== 'undefined' && window.location.port === '3000'
		? 'http://localhost:5167/api'
		: '/api')

export interface ChatRequest {
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

export function getSelectedResponseLanguage(): string {
	const language = i18n.resolvedLanguage ?? i18n.language ?? 'en'
	const code = Object.keys(RESPONSE_LANGUAGE_NAMES).find(
		supportedCode => language === supportedCode || language.startsWith(`${supportedCode}-`),
	) ?? 'en'

	return `${RESPONSE_LANGUAGE_NAMES[code]} (${code})`
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

export async function chatCached(request: ChatRequest): Promise<string> {
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
