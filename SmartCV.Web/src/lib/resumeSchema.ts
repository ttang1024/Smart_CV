import { z } from 'zod'

/**
 * The resume data model. The TypeScript types in types/resume.ts are inferred from this
 * schema, so the shape is defined once.
 *
 * It also validates resumes that arrive from outside the app — backup files and share
 * links: unknown keys are stripped, collections default to empty, and sizes are bounded
 * so a hostile file can't fill IndexedDB or lock up the editor.
 */

const MAX_TEXT = 100_000
const MAX_ITEMS = 500

const text = z.string().max(MAX_TEXT)
const optText = text.optional()
const id = z.string().min(1).max(200)
const list = <T extends z.ZodType>(item: T) => z.array(item).max(MAX_ITEMS).default([])

export const SectionSchema = z.enum([
	'personalInfo', 'summary', 'coreHighlights', 'experience', 'education', 'skills',
	'projects', 'certifications', 'languages', 'interests', 'achievements', 'referees',
])

export const ResumeSchema = z.object({
	id,
	name: text,
	createdAt: z.string().max(100),
	updatedAt: z.string().max(100),
	baseResumeId: id.optional(),
	jobApplicationId: id.optional(),
	versionLabel: optText,
	sectionOrder: z.array(SectionSchema).max(SectionSchema.options.length).optional(),
	sectionTitles: z.partialRecord(SectionSchema, text).optional(),
	personalInfo: z.object({
		fullName: text.default(''),
		email: text.default(''),
		phone: text.default(''),
		location: text.default(''),
		website: optText,
		linkedin: optText,
		github: optText,
		title: optText,
	}),
	summary: text.default(''),
	coreHighlights: list(z.object({ id, text })),
	experience: list(z.object({
		id,
		company: text.default(''),
		position: text.default(''),
		location: optText,
		startDate: text.default(''),
		endDate: optText,
		current: z.boolean().default(false),
		description: text.default(''),
		highlights: list(text),
		productLinks: z.array(text).max(MAX_ITEMS).optional(),
		projects: z.array(z.object({
			id,
			name: text.default(''),
			url: optText,
			description: optText,
			highlights: z.array(text).max(MAX_ITEMS).optional(),
		})).max(MAX_ITEMS).optional(),
	})),
	education: list(z.object({
		id,
		institution: text.default(''),
		degree: text.default(''),
		field: text.default(''),
		location: optText,
		startDate: text.default(''),
		endDate: optText,
		current: z.boolean().default(false),
		gpa: optText,
		honors: optText,
		description: optText,
	})),
	skills: list(z.object({ id, category: text.default(''), items: list(text) })),
	projects: list(z.object({
		id,
		name: text.default(''),
		description: text.default(''),
		technologies: list(text),
		url: optText,
		github: optText,
		startDate: optText,
		endDate: optText,
		highlights: list(text),
	})),
	certifications: list(z.object({
		id,
		name: text.default(''),
		issuer: text.default(''),
		date: text.default(''),
		expiryDate: optText,
		credentialId: optText,
		url: optText,
	})),
	languages: list(z.object({
		id,
		language: text.default(''),
		proficiency: z.enum(['Native', 'Fluent', 'Advanced', 'Intermediate', 'Basic']).catch('Intermediate'),
	})),
	interests: list(z.object({ id, name: text.default('') })),
	achievements: list(z.object({
		id,
		title: text.default(''),
		issuer: optText,
		date: optText,
		description: optText,
	})),
	referees: list(z.object({
		id,
		name: text.default(''),
		title: optText,
		company: optText,
		email: optText,
		phone: optText,
	})),
	targetJob: optText,
})

export function parseResume(data: unknown) {
	return ResumeSchema.parse(data)
}

/** Readable one-line summary of a validation failure for toasts. */
export function describeValidationError(error: unknown): string {
	if (error instanceof z.ZodError) {
		const issue = error.issues[0]
		return issue ? `${issue.path.join('.') || 'file'}: ${issue.message}` : 'Invalid data'
	}
	return error instanceof Error ? error.message : String(error)
}

export const SmartCvBackupSchema = z.object({
	app: z.literal('SmartCV'),
	schemaVersion: z.number().optional(),
	resumes: z.array(z.unknown()).max(1000),
})
