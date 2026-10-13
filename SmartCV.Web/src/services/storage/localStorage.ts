import type { AISettings } from '../../types/ai';
import { AI_PROVIDER_CONFIGS, AI_PROVIDER_IDS } from '../../types/ai';

const AI_SETTINGS_KEY = 'smartcv_ai_settings';

export function defaultAISettings(): AISettings {
  return {
    activeProvider: 'openai',
    useAI: false,
    providers: Object.fromEntries(
      AI_PROVIDER_IDS.map(id => [id, { apiKey: '', model: AI_PROVIDER_CONFIGS[id].defaultModel }]),
    ) as AISettings['providers'],
  };
}

/** AI settings, including API keys, persisted in this browser's localStorage. */
export const settingsStorage = {
  getAISettings(): AISettings {
    const defaults = defaultAISettings();
    try {
      const stored = JSON.parse(localStorage.getItem(AI_SETTINGS_KEY) ?? '{}') as Partial<AISettings>;
      return {
        ...defaults,
        ...stored,
        providers: { ...defaults.providers, ...stored.providers },
      };
    } catch {
      // Missing/corrupt data, or no localStorage (static prerender): use defaults.
      return defaults;
    }
  },

  saveAISettings(settings: AISettings): void {
    try {
      localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Storage unavailable (private mode, quota): settings last for this session only.
    }
  },
};
