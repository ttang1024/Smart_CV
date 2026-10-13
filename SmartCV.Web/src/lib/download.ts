/** Save a Blob to the user's device under `filename`. */
export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = filename
	document.body.appendChild(a)
	a.click()
	a.remove()
	// Revoking synchronously can cancel the download in some browsers.
	setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadJson(data: unknown, filename: string): void {
	downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), filename)
}
