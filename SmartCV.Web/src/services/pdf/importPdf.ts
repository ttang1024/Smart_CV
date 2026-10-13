import * as pdfjsLib from 'pdfjs-dist';
import type { Resume } from '../../types/resume';
import { API_BASE, readApiError } from '../../lib/api';
import { useSettingsStore } from '../../store/settingsStore';
import { extractPdfText, ocrPdf } from './pdfText';
import { toResume } from './parsedResume';

if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
}

/**
 * Import a PDF resume. One pipeline, two stages:
 *
 *  1. Text: read the PDF's text layer in the browser with pdf.js; image-only PDFs fall
 *     back to Tesseract OCR. The file itself never leaves the browser.
 *  2. Structure: the user's AI provider when AI is enabled and configured, otherwise the
 *     server's rule-based parser (/api/pdf/parse-text). If the AI call fails, the rule
 *     parser is used so an import still succeeds.
 */
export async function parseResumeFromPdf(file: File, options?: { useAI?: boolean }): Promise<Resume> {
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  try {
    let text = await extractPdfText(pdf);
    if (!text) {
      try {
        text = await ocrPdf(pdf);
      } catch (err) {
        throw new Error(
          `This PDF contains only images and OCR failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    if (!text) throw new Error('No readable text could be found in this PDF.');

    return toResume(await structureText(text, options?.useAI ?? false), file.name);
  } finally {
    await pdf.destroy();
  }
}

async function structureText(text: string, useAI: boolean): Promise<Record<string, unknown>> {
  const aiConfig = useAI ? useSettingsStore.getState().getActiveConfig() : null;
  if (aiConfig) {
    try {
      const { structureResumeWithAI } = await import('../ai/resumeParser');
      return await structureResumeWithAI(aiConfig, text);
    } catch {
      // Fall through to the rule-based parser.
    }
  }

  const response = await fetch(`${API_BASE}/pdf/parse-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) throw new Error(await readApiError(response, 'Resume parsing failed'));
  return (await response.json()) as Record<string, unknown>;
}
