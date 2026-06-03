/**
 * Robust JSON extraction for LLM responses.
 *
 * Models occasionally wrap JSON in markdown fences or add stray prose. This
 * helper strips common wrappers, isolates the first balanced JSON object, and
 * parses it — centralising the `content.match(/\{[\s\S]*\}/)` pattern that was
 * duplicated across the AI service.
 */
export function parseAIJson<T>(content: string): T {
	const cleaned = content
		.replace(/^\uFEFF/, '')
		.replace(/```(?:json)?/gi, '')
		.trim()

	// Fast path: the whole thing is already valid JSON.
	try {
		return JSON.parse(cleaned) as T
	} catch {
		// fall through to extraction
	}

	const extracted = extractFirstJsonObject(cleaned)
	if (!extracted) throw new Error('No JSON found in AI response')

	try {
		return JSON.parse(extracted) as T
	} catch (e) {
		throw new Error(
			`Failed to parse AI response: ${e instanceof Error ? e.message : 'Unknown error'}`,
		)
	}
}

/**
 * Scan for the first balanced `{ ... }` block, ignoring braces inside strings.
 * More reliable than a greedy regex when the model appends trailing commentary.
 */
function extractFirstJsonObject(text: string): string | null {
	const start = text.indexOf('{')
	if (start === -1) return null

	let depth = 0
	let inString = false
	let escaped = false

	for (let i = start; i < text.length; i++) {
		const char = text[i]

		if (escaped) {
			escaped = false
			continue
		}
		if (char === '\\') {
			escaped = true
			continue
		}
		if (char === '"') {
			inString = !inString
			continue
		}
		if (inString) continue

		if (char === '{') depth++
		else if (char === '}') {
			depth--
			if (depth === 0) return text.slice(start, i + 1)
		}
	}

	return null
}
