import type { AIProviderType } from '../../types/ai';
import { chatWithAI } from './chatClient';
import { parseAIJson } from '../../lib/aiJson';

/**
 * LinkedIn "Save to PDF" exports have a fixed shape (Contact / Top Skills
 * sidebar text, "Page N of N" footers, "(X years Y months)" date suffixes).
 * Detecting them lets us give the model targeted parsing guidance.
 */
function isLinkedInExport(rawText: string): boolean {
  return /linkedin\.com\/in\//i.test(rawText) && /page \d+ of \d+/i.test(rawText);
}

const LINKEDIN_HINT = `
NOTE: This text comes from a LinkedIn profile "Save to PDF" export. Handle its quirks:
- Ignore "Page N of N" footer lines mixed into the text.
- "Contact" and "Top Skills" sidebar content may appear before the main profile; map Top Skills into skills.
- Experience entries list the company on one line, then the job title, then dates like "January 2020 - Present (4 years 5 months)" — strip the duration in parentheses.
- A line with only a number after a company name is usually the employment count or duration, not a job title.
- The "Summary" section maps to summary; "Honors-Awards" maps to achievements; "Certifications" maps to certifications.`;

/**
 * Ask the user's AI provider to structure raw resume text. Returns the parsed JSON
 * payload; map it with `toResume` from services/pdf/parsedResume.
 */
export async function structureResumeWithAI(
  config: { provider: AIProviderType; apiKey: string; model: string },
  rawText: string,
): Promise<Record<string, unknown>> {
  const { provider, apiKey, model } = config;
  const linkedInHint = isLinkedInExport(rawText) ? LINKEDIN_HINT : '';
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
        content: `Parse this resume text into the following JSON structure. Extract every detail you can find.${linkedInHint}

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
      "highlights": [""],
      "projects": [{ "name": "", "url": "", "description": "", "highlights": [""] }],
      "productLinks": [""]
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
- projects should contain named products, launches, apps, client projects, case studies, or public work tied to that job. Include url, description, and highlights when present.
- productLinks should contain URLs for products, apps, launches, case studies, or public work tied to that job.
- interests should be a flat list of interest/hobby names.
- achievements should capture awards, prizes, recognitions, honours (not per-job bullet points).
- If the resume says "References available on request", return an empty referees array.
- Return ONLY the JSON object, nothing else.`
      }
    ]
  });

  return parseAIJson<Record<string, unknown>>(content);
}
