import * as pdfjsLib from 'pdfjs-dist';

// Configure worker — Vite copies the worker file via URL import
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export interface PDFParseResult {
  text: string;
  pageCount: number;
  fileName: string;
}

export async function extractTextFromPDF(file: File): Promise<PDFParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Group items by their vertical position to reconstruct lines
    const lines = new Map<number, { x: number; text: string }[]>();

    for (const item of textContent.items) {
      if (!('str' in item)) continue;
      const y = Math.round((item as { transform: number[] }).transform[5]);
      if (!lines.has(y)) lines.set(y, []);
      lines.get(y)!.push({
        x: (item as { transform: number[] }).transform[4],
        text: (item as { str: string }).str
      });
    }

    // Sort by y descending (top to bottom), then x ascending (left to right)
    const sortedLines = [...lines.entries()]
      .sort(([ya], [yb]) => yb - ya)
      .map(([, items]) =>
        items
          .sort((a, b) => a.x - b.x)
          .map(i => i.text)
          .join(' ')
          .trim()
      )
      .filter(Boolean);

    pageTexts.push(sortedLines.join('\n'));
  }

  return {
    text: pageTexts.join('\n\n---PAGE BREAK---\n\n'),
    pageCount: pdf.numPages,
    fileName: file.name
  };
}
