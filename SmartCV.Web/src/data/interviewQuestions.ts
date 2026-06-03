/**
 * Local interview question bank — no AI call required. Used to pre-seed the
 * Interview Prep questions box so users aren't staring at a blank textarea.
 */

export interface QuestionCategory {
	id: string;
	label: string;
	questions: string[];
}

export const QUESTION_BANK: QuestionCategory[] = [
	{
		id: 'general',
		label: 'General / Screening',
		questions: [
			'Tell me about yourself.',
			'Why are you interested in this role?',
			'Why are you leaving your current position?',
			'What do you know about our company?',
			'Where do you see yourself in five years?',
			'What are your salary expectations?',
		],
	},
	{
		id: 'behavioral',
		label: 'Behavioral (STAR)',
		questions: [
			'Describe a challenging project you delivered.',
			'Tell me about a time you disagreed with a teammate.',
			'Tell me about a time you failed and what you learned.',
			'Describe a time you had to meet a tight deadline.',
			'Tell me about a time you influenced a decision without authority.',
			'Describe a situation where you had to learn something quickly.',
		],
	},
	{
		id: 'leadership',
		label: 'Leadership & Ownership',
		questions: [
			'Tell me about a time you led a team through ambiguity.',
			'Describe a time you mentored or developed someone.',
			'Tell me about a difficult decision you had to make.',
			'How do you prioritise when everything feels urgent?',
			'Describe a time you took ownership of a problem outside your remit.',
		],
	},
	{
		id: 'technical',
		label: 'Technical / Problem Solving',
		questions: [
			'Walk me through your most technically complex project.',
			'How do you approach debugging a problem you have never seen?',
			'Describe a trade-off you made between speed and quality.',
			'How do you keep your technical skills current?',
			'Tell me about a system you designed and what you would change.',
		],
	},
	{
		id: 'stakeholder',
		label: 'Stakeholders & Communication',
		questions: [
			'Tell me about a time you managed a difficult stakeholder.',
			'How do you explain technical concepts to non-technical people?',
			'Describe a time you had to deliver bad news.',
			'Tell me about a time you gathered requirements from conflicting sources.',
		],
	},
	{
		id: 'closing',
		label: 'Closing',
		questions: [
			'What are your greatest strengths?',
			'What is your biggest weakness?',
			'Why should we hire you?',
			'Do you have any questions for us?',
		],
	},
];
