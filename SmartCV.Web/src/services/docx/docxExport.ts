import {
	AlignmentType,
	BorderStyle,
	Document,
	Packer,
	Paragraph,
	TextRun,
	convertMillimetersToTwip,
} from 'docx'
import type { Resume, ResumeSection } from '../../types/resume'
import { DEFAULT_SECTION_ORDER } from '../../types/resume'
import type { PageMarginsMm } from '../../components/resume/resumeTypes'
import { sectionTitle, dateRange } from '../../components/resume/resumeShared'
import { isRichTextEmpty } from '../../lib/richText'

export interface DocxExportOptions {
	pageSize: 'a4' | 'letter'
	pageMarginsMm: PageMarginsMm
	/** Hex accent colour for headings, e.g. "#047857". */
	accentColor: string
}

const PAGE_DIMENSIONS_MM = {
	a4: { width: 210, height: 297 },
	letter: { width: 215.9, height: 279.4 },
} as const

// docx colours are hex without the leading '#'
const docxColor = (hex: string) => hex.replace(/^#/, '')

const BODY_SIZE = 20 // half-points → 10pt
const MUTED = '666666'

/**
 * Convert a rich-text HTML field into docx paragraphs, preserving b/i/u
 * formatting and rendering list items as bullets. Plain text falls back to
 * one paragraph per line.
 */
function richTextToParagraphs(html: string, base?: { bullet?: boolean }): Paragraph[] {
	if (!html || isRichTextEmpty(html)) return []

	if (typeof DOMParser === 'undefined' || !html.includes('<')) {
		return html
			.split('\n')
			.map(line => line.trim())
			.filter(Boolean)
			.map(line => new Paragraph({
				children: [new TextRun({ text: line, size: BODY_SIZE })],
				...(base?.bullet ? { bullet: { level: 0 } } : {}),
			}))
	}

	const doc = new DOMParser().parseFromString(html, 'text/html')
	const paragraphs: Paragraph[] = []
	let runs: TextRun[] = []
	let runsAreBullet = base?.bullet ?? false

	const flush = () => {
		if (runs.length === 0) return
		paragraphs.push(new Paragraph({
			children: runs,
			...(runsAreBullet ? { bullet: { level: 0 } } : {}),
		}))
		runs = []
	}

	const walk = (node: Node, style: { bold: boolean; italics: boolean; underline: boolean }) => {
		if (node.nodeType === Node.TEXT_NODE) {
			const text = node.textContent ?? ''
			if (text) {
				runs.push(new TextRun({
					text,
					size: BODY_SIZE,
					bold: style.bold || undefined,
					italics: style.italics || undefined,
					underline: style.underline ? {} : undefined,
				}))
			}
			return
		}
		if (node.nodeType !== Node.ELEMENT_NODE) return
		const el = node as HTMLElement
		const tag = el.tagName

		if (tag === 'BR') {
			flush()
			return
		}

		const next = {
			bold: style.bold || tag === 'B' || tag === 'STRONG',
			italics: style.italics || tag === 'I' || tag === 'EM',
			underline: style.underline || tag === 'U',
		}

		if (tag === 'LI') {
			flush()
			runsAreBullet = true
			el.childNodes.forEach(child => walk(child, next))
			flush()
			runsAreBullet = base?.bullet ?? false
			return
		}

		const isBlock = ['DIV', 'P', 'UL', 'OL'].includes(tag)
		if (isBlock) flush()
		el.childNodes.forEach(child => walk(child, next))
		if (isBlock) flush()
	}

	doc.body.childNodes.forEach(child => walk(child, { bold: false, italics: false, underline: false }))
	flush()
	return paragraphs
}

function bulletsFrom(items: string[]): Paragraph[] {
	return items
		.filter(item => item && !isRichTextEmpty(item))
		.flatMap(item => richTextToParagraphs(item, { bullet: true }))
}

function headingParagraph(text: string, accent: string): Paragraph {
	return new Paragraph({
		spacing: { before: 240, after: 100 },
		border: {
			bottom: { style: BorderStyle.SINGLE, size: 6, color: docxColor(accent), space: 2 },
		},
		children: [new TextRun({
			text: text.toUpperCase(),
			bold: true,
			size: 22,
			color: docxColor(accent),
		})],
	})
}

function entryTitleLine(left: string, right?: string): Paragraph {
	const children: TextRun[] = [new TextRun({ text: left, bold: true, size: BODY_SIZE })]
	if (right) {
		children.push(new TextRun({ text: `   ${right}`, size: BODY_SIZE, color: MUTED }))
	}
	return new Paragraph({ spacing: { before: 120 }, children })
}

function mutedLine(text: string): Paragraph {
	return new Paragraph({
		children: [new TextRun({ text, italics: true, size: BODY_SIZE, color: MUTED })],
	})
}

function plainLine(text: string, opts?: { bold?: boolean }): Paragraph {
	return new Paragraph({
		children: [new TextRun({ text, size: BODY_SIZE, bold: opts?.bold || undefined })],
	})
}

function buildSection(resume: Resume, key: ResumeSection, accent: string): Paragraph[] {
	const r = resume
	const out: Paragraph[] = []
	const heading = (fallback: string) => out.push(headingParagraph(sectionTitle(r, key, fallback), accent))

	switch (key) {
		case 'personalInfo':
			return []

		case 'summary': {
			if (isRichTextEmpty(r.summary)) return []
			heading('Summary')
			out.push(...richTextToParagraphs(r.summary))
			return out
		}

		case 'coreHighlights': {
			const items = r.coreHighlights.map(h => h.text).filter(Boolean)
			if (items.length === 0) return []
			heading('Core Highlights')
			out.push(...bulletsFrom(items))
			return out
		}

		case 'experience': {
			if (r.experience.length === 0) return []
			heading('Experience')
			r.experience.forEach(exp => {
				const title = [exp.position, exp.company].filter(Boolean).join(' · ')
				out.push(entryTitleLine(title || 'Experience'))
				const meta = [
					dateRange(exp.startDate, exp.endDate, exp.current),
					exp.location,
				].filter(Boolean).join('  |  ')
				if (meta) out.push(mutedLine(meta))
				out.push(...richTextToParagraphs(exp.description))
				out.push(...bulletsFrom(exp.highlights))
				;(exp.projects ?? []).forEach(project => {
					if (!project.name && !project.description) return
					out.push(plainLine(`${project.name}${project.url ? ` — ${project.url}` : ''}`, { bold: true }))
					if (project.description) out.push(...richTextToParagraphs(project.description))
					out.push(...bulletsFrom(project.highlights ?? []))
				})
				;(exp.productLinks ?? []).filter(Boolean).forEach(link => out.push(mutedLine(link)))
			})
			return out
		}

		case 'education': {
			if (r.education.length === 0) return []
			heading('Education')
			r.education.forEach(edu => {
				const degree = [edu.degree, edu.field].filter(Boolean).join(' in ')
				out.push(entryTitleLine(degree || edu.institution))
				const meta = [
					edu.institution !== degree ? edu.institution : '',
					dateRange(edu.startDate, edu.endDate, edu.current),
					edu.location,
				].filter(Boolean).join('  |  ')
				if (meta) out.push(mutedLine(meta))
				const extras = [
					edu.gpa ? `GPA: ${edu.gpa}` : '',
					edu.honors ?? '',
				].filter(Boolean).join('  |  ')
				if (extras) out.push(plainLine(extras))
				if (edu.description && !isRichTextEmpty(edu.description)) {
					out.push(...richTextToParagraphs(edu.description))
				}
			})
			return out
		}

		case 'skills': {
			const skills = r.skills.filter(s => s.items.length > 0)
			if (skills.length === 0) return []
			heading('Skills')
			skills.forEach(skill => {
				out.push(new Paragraph({
					children: [
						...(skill.category ? [new TextRun({ text: `${skill.category}: `, bold: true, size: BODY_SIZE })] : []),
						new TextRun({ text: skill.items.join(', '), size: BODY_SIZE }),
					],
				}))
			})
			return out
		}

		case 'projects': {
			if (r.projects.length === 0) return []
			heading('Projects')
			r.projects.forEach(project => {
				out.push(entryTitleLine(project.name, dateRange(project.startDate, project.endDate)))
				const links = [project.url, project.github].filter(Boolean).join('  |  ')
				if (links) out.push(mutedLine(links))
				out.push(...richTextToParagraphs(project.description))
				if (project.technologies.length > 0) {
					out.push(plainLine(`Technologies: ${project.technologies.join(', ')}`))
				}
				out.push(...bulletsFrom(project.highlights))
			})
			return out
		}

		case 'certifications': {
			if (r.certifications.length === 0) return []
			heading('Certifications')
			r.certifications.forEach(cert => {
				const line = [cert.name, cert.issuer].filter(Boolean).join(' — ')
				out.push(entryTitleLine(line, cert.date))
			})
			return out
		}

		case 'languages': {
			if (r.languages.length === 0) return []
			heading('Languages')
			out.push(plainLine(r.languages.map(l => `${l.language} (${l.proficiency})`).join('  ·  ')))
			return out
		}

		case 'interests': {
			const names = r.interests.map(i => i.name).filter(Boolean)
			if (names.length === 0) return []
			heading('Interests')
			out.push(plainLine(names.join(', ')))
			return out
		}

		case 'achievements': {
			if (r.achievements.length === 0) return []
			heading('Achievements')
			r.achievements.forEach(achievement => {
				const title = [achievement.title, achievement.issuer].filter(Boolean).join(' — ')
				out.push(entryTitleLine(title, achievement.date))
				if (achievement.description) out.push(...richTextToParagraphs(achievement.description))
			})
			return out
		}

		case 'referees': {
			if (r.referees.length === 0) return []
			heading('References')
			r.referees.forEach(referee => {
				out.push(entryTitleLine(referee.name))
				const meta = [referee.title, referee.company].filter(Boolean).join(', ')
				if (meta) out.push(mutedLine(meta))
				const contact = [referee.email, referee.phone].filter(Boolean).join('  |  ')
				if (contact) out.push(plainLine(contact))
			})
			return out
		}

		default:
			return []
	}
}

export async function exportResumeAsDocx(resume: Resume, options: DocxExportOptions): Promise<Blob> {
	const { personalInfo: p } = resume
	const accent = options.accentColor
	const page = PAGE_DIMENSIONS_MM[options.pageSize]
	const margins = options.pageMarginsMm

	const contactLine = [p.email, p.phone, p.location, p.website, p.linkedin, p.github]
		.filter(Boolean)
		.join('  |  ')

	const header: Paragraph[] = [
		new Paragraph({
			alignment: AlignmentType.CENTER,
			children: [new TextRun({ text: p.fullName || 'Resume', bold: true, size: 36 })],
		}),
		...(p.title ? [new Paragraph({
			alignment: AlignmentType.CENTER,
			children: [new TextRun({ text: p.title, size: 24, color: docxColor(accent) })],
		})] : []),
		...(contactLine ? [new Paragraph({
			alignment: AlignmentType.CENTER,
			spacing: { after: 120 },
			children: [new TextRun({ text: contactLine, size: 18, color: MUTED })],
		})] : []),
	]

	const order = resume.sectionOrder ?? DEFAULT_SECTION_ORDER
	const body = order.flatMap(key => buildSection(resume, key, accent))

	const doc = new Document({
		styles: {
			default: {
				document: { run: { font: 'Calibri', size: BODY_SIZE } },
			},
		},
		sections: [{
			properties: {
				page: {
					size: {
						width: convertMillimetersToTwip(page.width),
						height: convertMillimetersToTwip(page.height),
					},
					margin: {
						top: convertMillimetersToTwip(margins.top),
						bottom: convertMillimetersToTwip(margins.bottom),
						left: convertMillimetersToTwip(margins.left),
						right: convertMillimetersToTwip(margins.right),
					},
				},
			},
			children: [...header, ...body],
		}],
	})

	return Packer.toBlob(doc)
}
