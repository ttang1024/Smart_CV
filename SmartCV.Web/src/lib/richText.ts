const ALLOWED_TAGS = new Set([
	'B',
	'STRONG',
	'I',
	'EM',
	'U',
	'SPAN',
	'BR',
	'DIV',
	'P',
	'UL',
	'OL',
	'LI',
])
const ALLOWED_LIST_STYLES = new Set([
	'disc',
	'square',
	'decimal',
	'lower-alpha',
	'upper-alpha',
	'lower-roman',
	'upper-roman',
	'none',
])

const LIST_STYLE_ALIASES = new Map<string, string>([
	['disc', 'disc'],
	['square', 'square'],
	['decimal', 'decimal'],
	['lower-alpha', 'lower-alpha'],
	['upper-alpha', 'upper-alpha'],
	['lower-roman', 'lower-roman'],
	['upper-roman', 'upper-roman'],
	['none', 'none'],
	['dash', 'dash'],
	['check', 'check'],
	['"- "', 'dash'],
	["'- '", 'dash'],
	['"✓ "', 'check'],
	["'✓ '", 'check'],
])

const DATA_LIST_STYLES = new Set([
	'disc',
	'circle',
	'square',
	'decimal',
	'lower-alpha',
	'upper-alpha',
	'lower-roman',
	'upper-roman',
	'dash',
	'check',
	'none',
])

export function normalizeListStyle(value: string | null | undefined): string | null {
	if (!value) return null
	const normalized = value.trim()
	return LIST_STYLE_ALIASES.get(normalized) ?? null
}

function sanitizeStyle(style: CSSStyleDeclaration): string | null {
	const safeStyles: string[] = []
	const color = style.color
	const fontSize = style.fontSize
	const lineHeight = style.lineHeight
	const listStyleType = style.listStyleType
	const normalizedListStyle = normalizeListStyle(listStyleType)

	if (color) safeStyles.push(`color: ${color}`)
	if (/^\d+(\.\d+)?(px|pt|em|rem|%)$/.test(fontSize)) safeStyles.push(`font-size: ${fontSize}`)
	if (/^(\d+(\.\d+)?|\d+(\.\d+)?(px|pt|em|rem|%))$/.test(lineHeight))
		safeStyles.push(`line-height: ${lineHeight}`)
	if (ALLOWED_LIST_STYLES.has(listStyleType)) safeStyles.push(`list-style-type: ${listStyleType}`)
	if (normalizedListStyle === 'dash' || normalizedListStyle === 'check') {
		safeStyles.push('list-style-type: none')
	}

	return safeStyles.length ? safeStyles.join('; ') : null
}

function sanitizeNode(node: Node, doc: Document): Node | null {
	if (node.nodeType === Node.TEXT_NODE) {
		return doc.createTextNode(node.textContent ?? '')
	}

	if (node.nodeType !== Node.ELEMENT_NODE) return null

	const element = node as HTMLElement
	if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED'].includes(element.tagName)) return null

	const tagName = ALLOWED_TAGS.has(element.tagName) ? element.tagName.toLowerCase() : 'span'
	const clean = doc.createElement(tagName)

	if (['span', 'div', 'p', 'ul', 'ol', 'li'].includes(tagName)) {
		const style = sanitizeStyle(element.style)
		if (style) clean.setAttribute('style', style)
	}

	if (tagName === 'ul' || tagName === 'ol') {
		const listStyle =
			normalizeListStyle(element.getAttribute('data-list-style')) ??
			normalizeListStyle(element.style.listStyleType)
		if (listStyle && DATA_LIST_STYLES.has(listStyle))
			clean.setAttribute('data-list-style', listStyle)
	}

	element.childNodes.forEach(child => {
		const cleanChild = sanitizeNode(child, doc)
		if (cleanChild) clean.appendChild(cleanChild)
	})

	return clean
}

/**
 * Without a DOM (static prerender), keep only allow-listed tags, drop all attributes and
 * escape everything else. Stricter than the DOM path, which also keeps safe styles.
 */
function sanitizeWithoutDom(value: string): string {
	const escape = (text: string) => text.replace(/</g, '&lt;').replace(/>/g, '&gt;')
	return value
		.replace(/<(script|style|iframe|object|embed)\b[\s\S]*?<\/\1\s*>/gi, '')
		.split(/(<[^<>]*>)/g)
		.map(part => {
			const tag = /^<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>$/.exec(part)
			if (!tag) return escape(part)
			const name = tag[2].toLowerCase()
			if (!ALLOWED_TAGS.has(name.toUpperCase())) return ''
			return name === 'br' ? '<br>' : `<${tag[1]}${name}>`
		})
		.join('')
}

// Rich text is re-rendered constantly (every keystroke, every layout), and the same
// strings recur, so sanitized output is memoised.
const SANITIZE_CACHE_LIMIT = 1000
const sanitizeCache = new Map<string, string>()

export function sanitizeRichText(value: string): string {
	if (!value.trim()) return ''
	if (typeof DOMParser === 'undefined' || typeof document === 'undefined') return sanitizeWithoutDom(value)

	const cached = sanitizeCache.get(value)
	if (cached !== undefined) return cached
	const clean = sanitizeWithDom(value)
	if (sanitizeCache.size >= SANITIZE_CACHE_LIMIT) {
		const oldest = sanitizeCache.keys().next().value
		if (oldest !== undefined) sanitizeCache.delete(oldest)
	}
	sanitizeCache.set(value, clean)
	return clean
}

function sanitizeWithDom(value: string): string {
	const parser = new DOMParser()
	const parsed = parser.parseFromString(value, 'text/html')
	const doc = document.implementation.createHTMLDocument('')

	parsed.body.childNodes.forEach(child => {
		const cleanChild = sanitizeNode(child, doc)
		if (cleanChild) doc.body.appendChild(cleanChild)
	})

	return doc.body.innerHTML
}

export function richTextToPlainText(value: string): string {
	if (!value) return ''
	if (typeof DOMParser === 'undefined') {
		return value
			.replace(/<br\s*\/?>/gi, '\n')
			.replace(/<\/(div|p|li)>/gi, '\n')
			.replace(/<[^>]*>/g, '')
			.replace(/&nbsp;/g, ' ')
			.replace(/&amp;/g, '&')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/\n{3,}/g, '\n\n')
			.trim()
	}

	const parser = new DOMParser()
	const parsed = parser.parseFromString(sanitizeRichText(value), 'text/html')
	const lines: string[] = []

	const walk = (node: Node) => {
		if (node.nodeType === Node.TEXT_NODE) {
			lines.push(node.textContent ?? '')
			return
		}

		if (node.nodeType !== Node.ELEMENT_NODE) return

		const element = node as HTMLElement
		if (element.tagName === 'BR') {
			lines.push('\n')
			return
		}

		const block = ['DIV', 'P', 'LI'].includes(element.tagName)
		if (block && lines.length && !lines[lines.length - 1].endsWith('\n')) lines.push('\n')
		element.childNodes.forEach(walk)
		if (block && lines.length && !lines[lines.length - 1].endsWith('\n')) lines.push('\n')
	}

	parsed.body.childNodes.forEach(walk)
	return lines
		.join('')
		.replace(/\n{3,}/g, '\n\n')
		.trim()
}

export function isRichTextEmpty(value: string): boolean {
	return !hasVisibleText(sanitizeRichText(value))
}

/**
 * Cheap emptiness check for *already sanitized* markup. Sanitized output only contains
 * allow-listed, attribute-light tags, so stripping tags with a regex is reliable here.
 */
export function hasVisibleText(sanitizedHtml: string): boolean {
	return sanitizedHtml.replace(/<[^>]*>/g, '').replace(/&nbsp;|\u00a0/g, ' ').trim().length > 0
}
