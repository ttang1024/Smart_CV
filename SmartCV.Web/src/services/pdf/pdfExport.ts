import { API_BASE, readApiError } from '../../lib/api';
import type { PageMarginsMm, StyleId } from '../../components/resume/resumeTypes';
import { PAGE_SIZES, type PageSizeId } from '../../components/resume/preview/constants';
import { buildResumePrintHtml } from '../../components/resume/preview/printHtml';

/**
 * Turn the on-screen resume paper into a standalone print document. The preview wrapper
 * and layout root carry a page-height minimum that would overflow the margined print
 * area and add a blank trailing page, so it is stripped from a clone.
 */
export function buildPrintDocument(
  paper: HTMLElement,
  options: { styleId: StyleId; pageSize: PageSizeId; pageMarginsMm: PageMarginsMm },
): string {
  const clone = paper.cloneNode(true) as HTMLElement;
  clone.style.width = 'auto';
  clone.style.minHeight = '';
  const layoutRoot = clone.firstElementChild as HTMLElement | null;
  if (layoutRoot) {
    layoutRoot.style.minHeight = '';
    // Executive paints a full-bleed coloured band, so it keeps its own padding.
    if (options.styleId !== 'executive') layoutRoot.style.padding = '0';
  }
  return buildResumePrintHtml(clone.outerHTML, PAGE_SIZES[options.pageSize].pageCss, options.pageMarginsMm);
}

/** Render a print document to PDF on the server (headless Chromium). */
export async function renderPdf(html: string, filename: string): Promise<Blob> {
  const response = await fetch(`${API_BASE}/pdf/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html, filename }),
  });
  if (!response.ok) throw new Error(await readApiError(response, 'PDF generation failed'));
  return response.blob();
}
