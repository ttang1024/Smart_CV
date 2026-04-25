import * as pdfjsLib from 'pdfjs-dist';
import type { Resume } from '../../types/resume';
import { generateId } from '../../lib/utils';

// Configure pdf.js worker (already configured in pdfParser.ts but needed here too)
if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
}

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

/**
 * Check if the PDF has embedded SmartCV resume JSON in its metadata.
 * This is set when exporting from SmartCV to allow lossless re-import.
 */
async function extractEmbeddedResume(arrayBuffer: ArrayBuffer): Promise<Resume | null> {
  try {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
    const meta = await pdf.getMetadata();
    const info = (meta.info as Record<string, string | undefined>) ?? {};
    const subject = info.Subject ?? '';
    if (subject.startsWith('smartcv-data:')) {
      const encoded = subject.slice('smartcv-data:'.length);
      const json = decodeURIComponent(escape(atob(encoded)));
      return JSON.parse(json) as Resume;
    }
  } catch {
    // ignore — fall through to text extraction
  }
  return null;
}

/**
 * Render each PDF page to a canvas and run Tesseract OCR.
 * Used as a last resort for image-only PDFs with no embedded metadata.
 */
async function ocrPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng');

  const allText: string[] = [];
  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      canvas.width  = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      const { data: { text } } = await worker.recognize(canvas);
      allText.push(text);
    }
  } finally {
    await worker.terminate();
  }

  return allText.join('\n\n');
}

function isResultEmpty(data: Record<string, unknown>): boolean {
  const info = data.personalInfo as Record<string, string> | undefined;
  return (
    !info?.fullName &&
    !info?.email &&
    !(data.experience as unknown[])?.length &&
    !(data.education as unknown[])?.length &&
    !(data.skills as unknown[])?.length
  );
}

function mapServerData(data: Record<string, unknown>, fileName: string): Resume {
  const resName = (data.personalInfo as Record<string, string>)?.fullName
    ? `${(data.personalInfo as Record<string, string>).fullName}'s Resume`
    : fileName.replace(/\.pdf$/i, '');

  return {
    id: generateId(),
    name: resName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    personalInfo: {
      fullName: (data.personalInfo as Record<string, string>)?.fullName  ?? '',
      email:    (data.personalInfo as Record<string, string>)?.email     ?? '',
      phone:    (data.personalInfo as Record<string, string>)?.phone     ?? '',
      location: (data.personalInfo as Record<string, string>)?.location  ?? '',
      title:    (data.personalInfo as Record<string, string>)?.title     ?? '',
      linkedin: (data.personalInfo as Record<string, string>)?.linkedIn  || (data.personalInfo as Record<string, string>)?.linkedin  || undefined,
      github:   (data.personalInfo as Record<string, string>)?.gitHub    || (data.personalInfo as Record<string, string>)?.github    || undefined,
      website:  (data.personalInfo as Record<string, string>)?.website   || undefined,
    },
    summary: String(data.summary ?? ''),
    experience: ((data.experience ?? []) as Record<string, unknown>[]).map((e) => ({
      id:          generateId(),
      company:     String(e.company   ?? ''),
      position:    String(e.position  ?? ''),
      location:    String(e.location  ?? ''),
      startDate:   String(e.startDate ?? ''),
      endDate:     e.current ? undefined : (e.endDate ? String(e.endDate) : undefined),
      current:     Boolean(e.current),
      description: String(e.description ?? ''),
      highlights:  Array.isArray(e.highlights) ? e.highlights.map(String) : [],
    })),
    education: ((data.education ?? []) as Record<string, unknown>[]).map((e) => ({
      id:          generateId(),
      institution: String(e.institution ?? ''),
      degree:      String(e.degree      ?? ''),
      field:       String(e.field       ?? ''),
      location:    String(e.location    ?? ''),
      startDate:   String(e.startDate   ?? ''),
      endDate:     e.current ? undefined : (e.endDate ? String(e.endDate) : undefined),
      current:     Boolean(e.current),
      gpa:         e.gpa    ? String(e.gpa)    : undefined,
      honors:      e.honors ? String(e.honors) : undefined,
    })),
    skills: ((data.skills ?? []) as Record<string, unknown>[]).map((s) => ({
      id:       generateId(),
      category: String(s.category ?? ''),
      items:    Array.isArray(s.items) ? s.items.map(String) : [],
    })),
    projects: ((data.projects ?? []) as Record<string, unknown>[]).map((p) => ({
      id:           generateId(),
      name:         String(p.name        ?? ''),
      description:  String(p.description ?? ''),
      technologies: Array.isArray(p.technologies) ? p.technologies.map(String) : [],
      highlights:   Array.isArray(p.highlights)   ? p.highlights.map(String)   : [],
      url:          p.url    ? String(p.url)    : undefined,
      github:       p.gitHub ? String(p.gitHub) : (p.github ? String(p.github) : undefined),
    })),
    certifications: ((data.certifications ?? []) as Record<string, unknown>[]).map((c) => ({
      id:           generateId(),
      name:         String(c.name         ?? ''),
      issuer:       String(c.issuer       ?? ''),
      date:         String(c.date         ?? ''),
      expiryDate:   c.expiryDate   ? String(c.expiryDate)   : undefined,
      credentialId: c.credentialId ? String(c.credentialId) : undefined,
    })),
    languages: ((data.languages ?? []) as Record<string, unknown>[]).map((l) => ({
      id:          generateId(),
      language:    String(l.language    ?? ''),
      proficiency: (['Native', 'Fluent', 'Advanced', 'Intermediate', 'Basic']
        .includes(String(l.proficiency))
          ? l.proficiency
          : 'Intermediate') as 'Native' | 'Fluent' | 'Advanced' | 'Intermediate' | 'Basic',
    })),
    achievements: ((data.achievements ?? []) as Record<string, unknown>[]).map((a) => ({
      id:          generateId(),
      title:       String(a.title       ?? ''),
      issuer:      a.issuer      ? String(a.issuer)      : undefined,
      date:        a.date        ? String(a.date)        : undefined,
      description: a.description ? String(a.description) : undefined,
    })),
    interests: ((data.interests ?? []) as unknown[]).map((name) => ({
      id:   generateId(),
      name: String(name ?? ''),
    })),
    referees: ((data.referees ?? []) as Record<string, unknown>[]).map((ref) => ({
      id:      generateId(),
      name:    String(ref.name    ?? ''),
      title:   ref.title   ? String(ref.title)   : undefined,
      company: ref.company ? String(ref.company) : undefined,
      email:   ref.email   ? String(ref.email)   : undefined,
      phone:   ref.phone   ? String(ref.phone)   : undefined,
    })),
    coreHighlights: [],
    targetJob: '',
  };
}

/**
 * Upload a PDF to the .NET backend for parsing.
 * Pipeline:
 *  1. Check for embedded SmartCV JSON metadata (lossless re-import of SmartCV exports)
 *  2. Server-side PdfPig text extraction (works for text-based PDFs)
 *  3. Client-side Tesseract OCR fallback (handles image-only PDFs, e.g. html2canvas exports)
 */
export async function parseResumeFromPdf(file: File): Promise<Resume> {
  const arrayBuffer = await file.arrayBuffer();

  // ── Step 1: embedded SmartCV metadata ────────────────────────────────────────
  const embedded = await extractEmbeddedResume(arrayBuffer);
  if (embedded) {
    return {
      ...embedded,
      id:        generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // ── Step 2: server-side text extraction ──────────────────────────────────────
  const form = new FormData();
  form.append('file', file);

  const response = await fetch(`${API_BASE}/pdf/parse`, {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    let msg = `Server error: ${response.status}`;
    try {
      const err = await response.json();
      msg = err?.error ?? msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }

  const data = await response.json() as Record<string, unknown>;

  if (!isResultEmpty(data)) {
    return mapServerData(data, file.name);
  }

  // ── Step 3: Tesseract OCR fallback for image-only PDFs ───────────────────────
  let ocrText: string;
  try {
    ocrText = await ocrPdf(arrayBuffer);
  } catch (err) {
    throw new Error(
      `This PDF contains only images and OCR failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (!ocrText.trim()) {
    throw new Error(
      'This PDF contains only images and no readable text could be extracted. ' +
      'For best results, use the Download button in SmartCV to re-export — ' +
      'future exports embed resume data for reliable re-import.'
    );
  }

  const textResponse = await fetch(`${API_BASE}/pdf/parse-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: ocrText }),
  });

  if (!textResponse.ok) throw new Error(`OCR parse failed: ${textResponse.status}`);

  const textData = await textResponse.json() as Record<string, unknown>;
  return mapServerData(textData, file.name);
}
