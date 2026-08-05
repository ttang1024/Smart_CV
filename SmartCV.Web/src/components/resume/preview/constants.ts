export const PAGE_SIZES = {
  a4: { label: 'A4', widthCss: '210mm', minHeightCss: '297mm', widthPx: 210 * (96 / 25.4), heightPx: 297 * (96 / 25.4), pageCss: 'A4' },
  letter: { label: 'Letter', widthCss: '8.5in', minHeightCss: '11in', widthPx: 8.5 * 96, heightPx: 11 * 96, pageCss: 'Letter' },
} as const;

export type PageSizeId = keyof typeof PAGE_SIZES;

export const MIN_PAGE_MARGIN_MM = 6;
export const MAX_PAGE_MARGIN_MM = 50;

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  (typeof window !== 'undefined' && window.location.port === '3000'
    ? 'http://localhost:5167/api'
    : '/api');
