import { z } from 'zod'
import type { Resume } from '../types/resume'
import type { CustomOptions, PageMarginsMm, StyleId } from '../components/resume/resumeTypes'
import { ResumeSchema } from './resumeSchema'

/**
 * Privacy-preserving share links: the whole payload is deflate-compressed and
 * base64url-encoded into the URL *fragment*. Fragments are never sent to the
 * server, so shared resumes stay end-to-end between the two browsers.
 */
export interface SharePayload {
	resume: Resume
	styleId: StyleId
	mainColor: string
	pageSize: 'a4' | 'letter'
	pageMarginsMm: PageMarginsMm
	backgroundColor?: string | null
	fullNameColor?: string
	customOptions?: CustomOptions
}

const hexColor = z.string().regex(/^#[0-9a-fA-F]{3,8}$/)
const margin = z.number().min(0).max(100)

// Share links are attacker-controlled input: validate every field before rendering.
const SharePayloadSchema = z.object({
	resume: ResumeSchema,
	styleId: z.enum(['classic', 'modern', 'executive', 'minimal', 'elegant', 'academic', 'split', 'timeline', 'custom']),
	mainColor: hexColor,
	pageSize: z.enum(['a4', 'letter']),
	pageMarginsMm: z.object({ top: margin, right: margin, bottom: margin, left: margin }),
	backgroundColor: hexColor.nullable().optional(),
	fullNameColor: hexColor.optional(),
	customOptions: z.object({
		header: z.enum(['classic', 'split']),
		experience: z.enum(['list', 'timeline']),
		skillsColumns: z.union([z.literal(1), z.literal(2)]),
		sectionStyle: z.enum(['bar', 'underline', 'plain']),
		skillsStyle: z.enum(['list', 'tags']),
		education: z.enum(['standard', 'compact']),
		summary: z.enum(['paragraph', 'callout']),
	}).optional(),
}) satisfies z.ZodType<SharePayload, unknown>

// Decompressed payloads above this are rejected (zip-bomb guard).
const MAX_DECODED_BYTES = 2_000_000

const COMPRESSED_PREFIX = 'c.'
const RAW_PREFIX = 'r.'

function bytesToBase64Url(bytes: Uint8Array): string {
	let binary = ''
	const CHUNK = 0x8000
	for (let i = 0; i < bytes.length; i += CHUNK) {
		binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
	}
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(encoded: string): Uint8Array {
	const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
	const binary = atob(base64)
	const bytes = new Uint8Array(binary.length)
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
	return bytes
}

async function pipeThrough(
	bytes: Uint8Array,
	stream: CompressionStream | DecompressionStream,
	maxBytes = Infinity,
): Promise<Uint8Array> {
	const writer = stream.writable.getWriter()
	// Don't await the write before reading: the stream applies backpressure.
	writer.write(bytes as Uint8Array<ArrayBuffer>).then(() => writer.close()).catch(() => {})
	const reader = stream.readable.getReader()
	const chunks: Uint8Array[] = []
	let total = 0
	for (;;) {
		const { done, value } = await reader.read()
		if (done) break
		total += value.length
		if (total > maxBytes) {
			await reader.cancel()
			throw new Error('Share link is too large')
		}
		chunks.push(value)
	}
	const out = new Uint8Array(total)
	let offset = 0
	for (const chunk of chunks) {
		out.set(chunk, offset)
		offset += chunk.length
	}
	return out
}

export async function encodeSharePayload(payload: SharePayload): Promise<string> {
	const json = new TextEncoder().encode(JSON.stringify(payload))
	if (typeof CompressionStream === 'undefined') {
		return RAW_PREFIX + bytesToBase64Url(json)
	}
	const compressed = await pipeThrough(json, new CompressionStream('deflate-raw'))
	return COMPRESSED_PREFIX + bytesToBase64Url(compressed)
}

export async function decodeSharePayload(encoded: string): Promise<SharePayload> {
	let bytes: Uint8Array
	if (encoded.startsWith(COMPRESSED_PREFIX)) {
		bytes = await pipeThrough(
			base64UrlToBytes(encoded.slice(COMPRESSED_PREFIX.length)),
			new DecompressionStream('deflate-raw'),
			MAX_DECODED_BYTES,
		)
	} else if (encoded.startsWith(RAW_PREFIX)) {
		bytes = base64UrlToBytes(encoded.slice(RAW_PREFIX.length))
	} else {
		throw new Error('Unrecognized share link format')
	}

	if (bytes.length > MAX_DECODED_BYTES) throw new Error('Share link is too large')

	const result = SharePayloadSchema.safeParse(JSON.parse(new TextDecoder().decode(bytes)))
	if (!result.success) throw new Error('Share link does not contain a valid resume')
	return result.data
}

export function buildShareUrl(encoded: string): string {
	return `${window.location.origin}/share#d=${encoded}`
}

export function readShareFragment(): string | null {
	const match = window.location.hash.match(/#d=(.+)$/)
	return match ? match[1] : null
}
