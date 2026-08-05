// Barrel for the AI service modules. Split from a single large file into
// focused modules; this re-export keeps existing import paths stable.
export { chatWithAI, chatCached, getSelectedResponseLanguage } from './chatClient'
export type { ChatRequest } from './chatClient'
export { formatResumeAsText } from './resumeFormatter'
export { buildOptimizationPrompt, optimizeResume } from './optimize'
export { improveSection } from './improveSection'
export { buildCoverLetterPrompt, generateCoverLetter } from './coverLetter'
export type { CoverLetterRequest } from './coverLetter'
export { buildInterviewPrepPrompt, generateInterviewPrep } from './interviewPrep'
export type {
	InterviewPrepRequest,
	InterviewAnswer,
	StarStory,
	InterviewPrepResult,
} from './interviewPrep'
export { startMockInterview, evaluateMockAnswer } from './mockInterview'
export type {
	MockInterviewConfig,
	MockInterviewTurn,
	MockAnswerEvaluation,
} from './mockInterview'
