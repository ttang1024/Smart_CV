import type { Resume } from '../../types/resume'
import { richTextToPlainText } from '../../lib/richText'

export function formatResumeAsText(resume: Resume): string {
	const lines: string[] = []
	const {
		personalInfo,
		summary,
		experience,
		education,
		skills,
		projects,
		certifications,
		languages,
	} = resume

	lines.push(`Name: ${personalInfo.fullName}`)
	if (personalInfo.title) lines.push(`Title: ${personalInfo.title}`)
	lines.push(`Email: ${personalInfo.email}`)
	if (personalInfo.phone) lines.push(`Phone: ${personalInfo.phone}`)
	if (personalInfo.location) lines.push(`Location: ${personalInfo.location}`)
	if (personalInfo.linkedin) lines.push(`LinkedIn: ${personalInfo.linkedin}`)
	if (personalInfo.github) lines.push(`GitHub: ${personalInfo.github}`)

	if (summary) {
		lines.push('\nSUMMARY:')
		lines.push(richTextToPlainText(summary))
	}

	if (experience.length > 0) {
		lines.push('\nEXPERIENCE:')
		experience.forEach(exp => {
			lines.push(
				`${exp.position} at ${exp.company} (${exp.startDate} - ${exp.current ? 'Present' : (exp.endDate ?? '')})`,
			)
			;(exp.projects ?? [])
				.filter(project => project.name || project.url || project.description || (project.highlights ?? []).some(Boolean))
				.forEach(project => {
					lines.push(`Project: ${project.name}${project.url ? ` (${project.url})` : ''}`)
					if (project.description) lines.push(richTextToPlainText(project.description))
					;(project.highlights ?? []).forEach(h => lines.push(`• ${richTextToPlainText(h)}`))
				})
			;(exp.productLinks ?? []).filter(Boolean).forEach(link => lines.push(`Product: ${link}`))
			if (exp.description) lines.push(richTextToPlainText(exp.description))
			exp.highlights.forEach(h => lines.push(`• ${richTextToPlainText(h)}`))
		})
	}

	if (education.length > 0) {
		lines.push('\nEDUCATION:')
		education.forEach(edu => {
			lines.push(
				`${edu.degree} in ${edu.field} - ${edu.institution} (${edu.startDate} - ${edu.current ? 'Present' : (edu.endDate ?? '')})`,
			)
			if (edu.gpa) lines.push(`GPA: ${edu.gpa}`)
		})
	}

	if (skills.length > 0) {
		lines.push('\nSKILLS:')
		skills.forEach(s => lines.push(`${s.category}: ${s.items.join(', ')}`))
	}

	if (projects.length > 0) {
		lines.push('\nPROJECTS:')
		projects.forEach(p => {
			lines.push(`${p.name}: ${richTextToPlainText(p.description)}`)
			if (p.technologies.length > 0) lines.push(`Technologies: ${p.technologies.join(', ')}`)
		})
	}

	if (certifications.length > 0) {
		lines.push('\nCERTIFICATIONS:')
		certifications.forEach(c => lines.push(`${c.name} - ${c.issuer} (${c.date})`))
	}

	if (languages.length > 0) {
		lines.push('\nLANGUAGES:')
		languages.forEach(l => lines.push(`${l.language}: ${l.proficiency}`))
	}

	return lines.join('\n')
}
