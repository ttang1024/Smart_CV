export type InlineAIAction = 'rewrite' | 'concise' | 'metrics' | 'tailor' | 'grammar';

export interface InlineAIContext {
  jobDescription: string;
}
