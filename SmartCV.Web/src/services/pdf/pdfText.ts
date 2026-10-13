import type { PDFDocumentProxy } from 'pdfjs-dist';

/** Gap (in PDF points) between two runs on a line that marks a column boundary. */
const COLUMN_GAP_PT = 8;

export interface TextRun {
	str: string;
	x: number;
	y: number;
	width: number;
	fontSize: number;
}

/**
 * Rebuild reading-order lines from positioned text runs: runs are grouped by baseline,
 * ordered left to right, and joined with a tab across column-sized gaps. The server's
 * rule-based parser relies on that tab to recognise two-column layouts.
 */
export function runsToLines(runs: TextRun[]): string[] {
	const byBaseline = new Map<number, TextRun[]>();
	for (const run of runs) {
		// pdf.js fills wide gaps with a synthetic whitespace run spanning the gap; drop it
		// so the gap itself stays measurable.
		if (!run.str.trim()) continue;
		const y = Math.round(run.y);
		const bucket = byBaseline.get(y);
		if (bucket) bucket.push(run);
		else byBaseline.set(y, [run]);
	}

	return [...byBaseline.entries()]
		.sort(([a], [b]) => b - a)
		.map(([, line]) => {
			line.sort((a, b) => a.x - b.x);
			let text = '';
			let prevRight: number | null = null;
			for (const run of line) {
				if (prevRight !== null) {
					const gap = run.x - prevRight;
					if (gap > COLUMN_GAP_PT) text = text.trimEnd() + '\t';
					else if (gap > run.fontSize * 0.15 && !text.endsWith(' ') && !run.str.startsWith(' ')) text += ' ';
				}
				text += text.endsWith('\t') ? run.str.trimStart() : run.str;
				prevRight = run.x + run.width;
			}
			return text.replace(/ {2,}/g, ' ').trim();
		})
		.filter(Boolean);
}

/** Extract the text layer of every page; pages are separated by a blank line. */
export async function extractPdfText(pdf: PDFDocumentProxy): Promise<string> {
	const pages: string[] = [];
	for (let i = 1; i <= pdf.numPages; i++) {
		const page = await pdf.getPage(i);
		const content = await page.getTextContent();
		const runs: TextRun[] = [];
		for (const item of content.items) {
			if (!('str' in item)) continue;
			const [, , c, d, x, y] = item.transform as number[];
			runs.push({ str: item.str, x, y, width: item.width, fontSize: Math.hypot(c, d) || item.height });
		}
		pages.push(runsToLines(runs).join('\n'));
	}
	return pages.join('\n\n').trim();
}

/** Render each page to a canvas and OCR it. Last resort for image-only PDFs. */
export async function ocrPdf(pdf: PDFDocumentProxy): Promise<string> {
	const { createWorker } = await import('tesseract.js');
	const worker = await createWorker('eng');

	const pages: string[] = [];
	try {
		for (let i = 1; i <= pdf.numPages; i++) {
			const page = await pdf.getPage(i);
			const viewport = page.getViewport({ scale: 2.0 });
			const canvas = document.createElement('canvas');
			canvas.width = viewport.width;
			canvas.height = viewport.height;
			const ctx = canvas.getContext('2d');
			if (!ctx) throw new Error('Canvas is not available');
			await page.render({ canvas, canvasContext: ctx, viewport }).promise;
			const { data: { text } } = await worker.recognize(canvas);
			pages.push(text);
		}
	} finally {
		await worker.terminate();
	}
	return pages.join('\n\n').trim();
}
