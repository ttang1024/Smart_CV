import type { Resume } from '../types/resume'
import type { PageMarginsMm, StyleId } from '../components/resume/resumeTypes'

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
}

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

async function pipeThrough(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
	const piped = new Blob([bytes as BlobPart]).stream().pipeThrough(stream)
	return new Uint8Array(await new Response(piped).arrayBuffer())
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
		)
	} else if (encoded.startsWith(RAW_PREFIX)) {
		bytes = base64UrlToBytes(encoded.slice(RAW_PREFIX.length))
	} else {
		throw new Error('Unrecognized share link format')
	}

	const payload = JSON.parse(new TextDecoder().decode(bytes)) as SharePayload
	if (!payload?.resume?.personalInfo) throw new Error('Share link does not contain a resume')
	return payload
}

export function buildShareUrl(encoded: string): string {
	return `${window.location.origin}/share#d=${encoded}`
}

export function readShareFragment(): string | null {
	const match = window.location.hash.match(/#d=(.+)$/)
	return match ? match[1] : null
}
