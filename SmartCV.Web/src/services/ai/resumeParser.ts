import type { AIProviderType } from '../../types/ai';
import type { Resume } from '../../types/resume';
import { chatWithAI } from './aiService';
import { generateId } from '../../lib/utils';

export async function parseResumeFromText(
  provider: AIProviderType,
  apiKey: string,
  model: string,
  rawText: string,
  fileName: string
): Promise<Resume> {
  const content = await chatWithAI({
    provider,
    apiKey,
    model,
    temperature: 0.1,
    messages: [
      {
        role: 'system',
        content: `You are an expert resume parser. Extract all information from the provided resume text and return it as structured JSON. Be thorough and accurate. Return ONLY valid JSON, no markdown, no extra text.`
      },
      {
        role: 'user',
        content: `Parse this resume text into the following JSON structure. Extract every detail you can find.

RESUME TEXT:
${rawText}

Return this exact JSON structure (omit optional fields if not found):
{
  "personalInfo": {
    "fullName": "",
    "email": "",
    "phone": "",
    "location": "",
    "title": "",
    "linkedin": "",
    "github": "",
    "website": ""
  },
  "summary": "",
  "experience": [
    {
      "company": "",
      "position": "",
      "location": "",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM",
      "current": false,
      "description": "",
      "highlights": [""]
    }
  ],
  "education": [
    {
      "institution": "",
      "degree": "",
      "field": "",
      "location": "",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM",
      "current": false,
      "gpa": "",
      "honors": ""
    }
  ],
  "skills": [
    {
      "category": "",
      "items": [""]
    }
  ],
  "projects": [
    {
      "name": "",
      "description": "",
      "technologies": [""],
      "url": "",
      "github": ""
    }
  ],
  "certifications": [
    {
      "name": "",
      "issuer": "",
      "date": "YYYY-MM",
      "expiryDate": "YYYY-MM",
      "credentialId": ""
    }
  ],
  "languages": [
    {
      "language": "",
      "proficiency": "Native|Fluent|Advanced|Intermediate|Basic"
    }
  ],
  "interests": [""],
  "achievements": [
    {
      "title": "",
      "issuer": "",
      "date": "YYYY-MM",
      "description": ""
    }
  ],
  "referees": [
    {
      "name": "",
      "title": "",
      "company": "",
      "email": "",
      "phone": ""
    }
  ]
}

Rules:
- Dates must be in "YYYY-MM" format (e.g. "2022-03"). If only year is given use "YYYY-01".
- If current job/education, set current=true and omit endDate.
- For skills, group by category (e.g. "Languages", "Frameworks", "Tools", "Databases").
- highlights should be individual bullet points from the job description.
- interests should be a flat list of interest/hobby names.
- achievements should capture awards, prizes, recognitions, honours (not per-job bullet points).
- If the resume says "References available on request", return an empty referees array.
- Return ONLY the JSON object, nothing else.`
      }
    ]
  });

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI returned no parseable JSON');

  const parsed = JSON.parse(jsonMatch[0]);

  // Derive a resume name from the file or full name
  const resName = parsed.personalInfo?.fullName
    ? `${parsed.personalInfo.fullName}'s Resume`
    : fileName.replace(/\.pdf$/i, '');

  return {
    id: generateId(),
    name: resName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    personalInfo: {
      fullName: parsed.personalInfo?.fullName ?? '',
      email: parsed.personalInfo?.email ?? '',
      phone: parsed.personalInfo?.phone ?? '',
      location: parsed.personalInfo?.location ?? '',
      title: parsed.personalInfo?.title ?? '',
      linkedin: parsed.personalInfo?.linkedin ?? undefined,
      github: parsed.personalInfo?.github ?? undefined,
      website: parsed.personalInfo?.website ?? undefined
    },
    summary: parsed.summary ?? '',
    experience: (parsed.experience ?? []).map((e: Record<string, unknown>) => ({
      id: generateId(),
      company: String(e.company ?? ''),
      position: String(e.position ?? ''),
      location: String(e.location ?? ''),
      startDate: String(e.startDate ?? ''),
      endDate: e.current ? undefined : String(e.endDate ?? ''),
      current: Boolean(e.current),
      description: String(e.description ?? ''),
      highlights: Array.isArray(e.highlights) ? e.highlights.map(String) : []
    })),
    education: (parsed.education ?? []).map((e: Record<string, unknown>) => ({
      id: generateId(),
      institution: String(e.institution ?? ''),
      degree: String(e.degree ?? ''),
      field: String(e.field ?? ''),
      location: String(e.location ?? ''),
      startDate: String(e.startDate ?? ''),
      endDate: e.current ? undefined : String(e.endDate ?? ''),
      current: Boolean(e.current),
      gpa: e.gpa ? String(e.gpa) : undefined,
      honors: e.honors ? String(e.honors) : undefined
    })),
    skills: (parsed.skills ?? []).map((s: Record<string, unknown>) => ({
      id: generateId(),
      category: String(s.category ?? ''),
      items: Array.isArray(s.items) ? s.items.map(String) : []
    })),
    projects: (parsed.projects ?? []).map((p: Record<string, unknown>) => ({
      id: generateId(),
      name: String(p.name ?? ''),
      description: String(p.description ?? ''),
      technologies: Array.isArray(p.technologies) ? p.technologies.map(String) : [],
      url: p.url ? String(p.url) : undefined,
      github: p.github ? String(p.github) : undefined
    })),
    certifications: (parsed.certifications ?? []).map((c: Record<string, unknown>) => ({
      id: generateId(),
      name: String(c.name ?? ''),
      issuer: String(c.issuer ?? ''),
      date: String(c.date ?? ''),
      expiryDate: c.expiryDate ? String(c.expiryDate) : undefined,
      credentialId: c.credentialId ? String(c.credentialId) : undefined
    })),
    languages: (parsed.languages ?? []).map((l: Record<string, unknown>) => ({
      id: generateId(),
      language: String(l.language ?? ''),
      proficiency: (['Native', 'Fluent', 'Advanced', 'Intermediate', 'Basic'].includes(String(l.proficiency))
        ? l.proficiency
        : 'Intermediate') as 'Native' | 'Fluent' | 'Advanced' | 'Intermediate' | 'Basic'
    })),
    interests: (parsed.interests ?? []).map((name: unknown) => ({
      id: generateId(),
      name: String(name ?? '')
    })),
    achievements: (parsed.achievements ?? []).map((a: Record<string, unknown>) => ({
      id:          generateId(),
      title:       String(a.title ?? ''),
      issuer:      a.issuer      ? String(a.issuer)      : undefined,
      date:        a.date        ? String(a.date)        : undefined,
      description: a.description ? String(a.description) : undefined,
    })),
    referees: (parsed.referees ?? []).map((ref: Record<string, unknown>) => ({
      id:      generateId(),
      name:    String(ref.name    ?? ''),
      title:   ref.title   ? String(ref.title)   : undefined,
      company: ref.company ? String(ref.company) : undefined,
      email:   ref.email   ? String(ref.email)   : undefined,
      phone:   ref.phone   ? String(ref.phone)   : undefined,
    })),
    coreHighlights: []
  };
}
