/**
 * Interchange with the JSON Resume standard (https://jsonresume.org/schema/).
 *
 * Lets users export a SmartCV resume into the portable JSON Resume format used
 * by many other tools, and import a JSON Resume file back into SmartCV.
 */
import type { Resume } from '../types/resume';
import { generateId } from '../lib/utils';
import { richTextToPlainText } from '../lib/richText';

export interface JsonResume {
	$schema?: string;
	basics?: {
		name?: string;
		label?: string;
		email?: string;
		phone?: string;
		url?: string;
		summary?: string;
		location?: { city?: string; region?: string; countryCode?: string; address?: string };
		profiles?: Array<{ network?: string; username?: string; url?: string }>;
	};
	work?: Array<{ name?: string; company?: string; position?: string; location?: string; startDate?: string; endDate?: string; summary?: string; highlights?: string[]; url?: string }>;
	education?: Array<{ institution?: string; area?: string; studyType?: string; startDate?: string; endDate?: string; score?: string; gpa?: string }>;
	skills?: Array<{ name?: string; keywords?: string[] }>;
	projects?: Array<{ name?: string; description?: string; highlights?: string[]; keywords?: string[]; url?: string }>;
	certificates?: Array<{ name?: string; issuer?: string; date?: string; url?: string }>;
	languages?: Array<{ language?: string; fluency?: string }>;
	interests?: Array<{ name?: string }>;
	references?: Array<{ name?: string; reference?: string }>;
	awards?: Array<{ title?: string; awarder?: string; date?: string; summary?: string }>;
}

const PROFICIENCY_MAP: Record<string, 'Native' | 'Fluent' | 'Advanced' | 'Intermediate' | 'Basic'> = {
	native: 'Native', fluent: 'Fluent', advanced: 'Advanced', intermediate: 'Intermediate', basic: 'Basic',
};

/** Detect whether a parsed object looks like a JSON Resume document. */
export function isJsonResume(value: unknown): value is JsonResume {
	if (!value || typeof value !== 'object') return false;
	const obj = value as Record<string, unknown>;
	if (typeof obj.$schema === 'string' && obj.$schema.includes('jsonresume')) return true;
	return 'basics' in obj || 'work' in obj || ('skills' in obj && !('personalInfo' in obj));
}

export function toJsonResume(resume: Resume): JsonResume {
	const { personalInfo: p } = resume;
	const profiles = [
		p.linkedin && { network: 'LinkedIn', url: p.linkedin },
		p.github && { network: 'GitHub', url: p.github },
	].filter(Boolean) as Array<{ network: string; url: string }>;

	return {
		$schema: 'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
		basics: {
			name: p.fullName,
			label: p.title,
			email: p.email,
			phone: p.phone,
			url: p.website,
			summary: richTextToPlainText(resume.summary),
			location: p.location ? { address: p.location } : undefined,
			profiles: profiles.length ? profiles : undefined,
		},
		work: resume.experience.map(exp => ({
			name: exp.company,
			position: exp.position,
			location: exp.location,
			startDate: exp.startDate,
			endDate: exp.current ? undefined : exp.endDate,
			summary: richTextToPlainText(exp.description),
			highlights: exp.highlights.map(richTextToPlainText).filter(Boolean),
		})),
		education: resume.education.map(edu => ({
			institution: edu.institution,
			area: edu.field,
			studyType: edu.degree,
			startDate: edu.startDate,
			endDate: edu.current ? undefined : edu.endDate,
			score: edu.gpa,
		})),
		skills: resume.skills.map(skill => ({ name: skill.category, keywords: skill.items })),
		projects: resume.projects.map(proj => ({
			name: proj.name,
			description: richTextToPlainText(proj.description),
			highlights: proj.highlights.map(richTextToPlainText).filter(Boolean),
			keywords: proj.technologies,
			url: proj.url,
		})),
		certificates: resume.certifications.map(cert => ({ name: cert.name, issuer: cert.issuer, date: cert.date, url: cert.url })),
		languages: resume.languages.map(lang => ({ language: lang.language, fluency: lang.proficiency })),
		interests: resume.interests.map(interest => ({ name: interest.name })),
		references: resume.referees.map(ref => ({ name: ref.name, reference: [ref.title, ref.company].filter(Boolean).join(', ') })),
		awards: resume.achievements.map(ach => ({ title: ach.title, awarder: ach.issuer, date: ach.date, summary: ach.description })),
	};
}

export function fromJsonResume(json: JsonResume, name = 'Imported Resume'): Resume {
	const now = new Date().toISOString();
	const basics = json.basics ?? {};
	const linkedin = basics.profiles?.find(pr => /linkedin/i.test(pr.network ?? ''))?.url;
	const github = basics.profiles?.find(pr => /github/i.test(pr.network ?? ''))?.url;

	return {
		id: generateId(),
		name,
		createdAt: now,
		updatedAt: now,
		personalInfo: {
			fullName: basics.name ?? '',
			title: basics.label ?? '',
			email: basics.email ?? '',
			phone: basics.phone ?? '',
			location: basics.location?.address ?? [basics.location?.city, basics.location?.region].filter(Boolean).join(', '),
			website: basics.url,
			linkedin,
			github,
		},
		summary: basics.summary ?? '',
		coreHighlights: [],
		experience: (json.work ?? []).map(work => ({
			id: generateId(),
			company: work.name ?? work.company ?? '',
			position: work.position ?? '',
			location: work.location,
			startDate: work.startDate ?? '',
			endDate: work.endDate,
			current: !work.endDate,
			description: work.summary ?? '',
			highlights: work.highlights ?? [],
		})),
		education: (json.education ?? []).map(edu => ({
			id: generateId(),
			institution: edu.institution ?? '',
			degree: edu.studyType ?? '',
			field: edu.area ?? '',
			startDate: edu.startDate ?? '',
			endDate: edu.endDate,
			current: !edu.endDate,
			gpa: edu.score ?? edu.gpa,
		})),
		skills: (json.skills ?? []).map(skill => ({
			id: generateId(),
			category: skill.name ?? 'Skills',
			items: skill.keywords ?? [],
		})),
		projects: (json.projects ?? []).map(proj => ({
			id: generateId(),
			name: proj.name ?? '',
			description: proj.description ?? '',
			technologies: proj.keywords ?? [],
			url: proj.url,
			highlights: proj.highlights ?? [],
		})),
		certifications: (json.certificates ?? []).map(cert => ({
			id: generateId(),
			name: cert.name ?? '',
			issuer: cert.issuer ?? '',
			date: cert.date ?? '',
			url: cert.url,
		})),
		languages: (json.languages ?? []).map(lang => ({
			id: generateId(),
			language: lang.language ?? '',
			proficiency: PROFICIENCY_MAP[(lang.fluency ?? '').toLowerCase()] ?? 'Intermediate',
		})),
		interests: (json.interests ?? []).map(interest => ({ id: generateId(), name: interest.name ?? '' })),
		achievements: (json.awards ?? []).map(award => ({
			id: generateId(),
			title: award.title ?? '',
			issuer: award.awarder,
			date: award.date,
			description: award.summary,
		})),
		referees: (json.references ?? []).map(ref => ({ id: generateId(), name: ref.name ?? '', title: ref.reference })),
	};
}
