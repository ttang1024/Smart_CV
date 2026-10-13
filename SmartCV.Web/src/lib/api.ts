/**
 * Base URL for the SmartCV .NET API.
 *
 * In production the API serves the static export, so it is same-origin (`/api`). Under
 * `next dev` the API runs separately on :5167. NEXT_PUBLIC_API_URL overrides both.
 */
export const API_BASE =
	process.env.NEXT_PUBLIC_API_URL ??
	(process.env.NODE_ENV === 'development' ? 'http://localhost:5167/api' : '/api')

/** Read the `{ error }` message the API returns on failure, falling back to the status. */
export async function readApiError(response: Response, fallback: string): Promise<string> {
	try {
		const body = await response.json()
		if (typeof body?.error === 'string' && body.error) return body.error
		if (typeof body?.title === 'string' && body.title) return body.title
	} catch {
		// non-JSON error body
	}
	return `${fallback} (${response.status}${response.statusText ? ` ${response.statusText}` : ''})`
}
