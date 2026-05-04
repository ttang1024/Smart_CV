import type { AISettings, AIProviderType } from '../../types/ai';

const KEYS = {
  AI_SETTINGS: 'smartcv_ai_settings',
  THEME: 'smartcv_theme',
  SIDEBAR_OPEN: 'smartcv_sidebar_open'
} as const;

const DEFAULT_AI_SETTINGS: AISettings = {
  activeProvider: 'openai',
  useAI: false,
  providers: {
    openai: { apiKey: '', model: 'gpt-4o' },
    gemini: { apiKey: '', model: 'gemini-2.5-pro' },
    claude: { apiKey: '', model: 'claude-opus-4-6' },
    grok: { apiKey: '', model: 'grok-3' },
    deepseek: { apiKey: '', model: 'deepseek-v4-flash' },
    qianwen: { apiKey: '', model: 'qwen-plus' },
    kimi: { apiKey: '', model: 'moonshot-v1-32k' },
    doubao: { apiKey: '', model: 'doubao-pro-32k' },
    wenyanyixin: { apiKey: '', model: 'ernie-4.0-8k' }
  }
};

export const settingsStorage = {
  getAISettings(): AISettings {
    try {
      const raw = localStorage.getItem(KEYS.AI_SETTINGS);
      if (!raw) return DEFAULT_AI_SETTINGS;
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_AI_SETTINGS,
        ...parsed,
        providers: {
          ...DEFAULT_AI_SETTINGS.providers,
          ...parsed.providers,
        }
      };
    } catch {
      return DEFAULT_AI_SETTINGS;
    }
  },

  saveAISettings(settings: AISettings): void {
    localStorage.setItem(KEYS.AI_SETTINGS, JSON.stringify(settings));
  },

  saveAPIKey(provider: AIProviderType, key: string): void {
    const settings = settingsStorage.getAISettings();
    settings.providers[provider].apiKey = key;
    settingsStorage.saveAISettings(settings);
  },

  saveActiveProvider(provider: AIProviderType): void {
    const settings = settingsStorage.getAISettings();
    settings.activeProvider = provider;
    settingsStorage.saveAISettings(settings);
  },

  saveProviderModel(provider: AIProviderType, model: string): void {
    const settings = settingsStorage.getAISettings();
    settings.providers[provider].model = model;
    settingsStorage.saveAISettings(settings);
  },

  getTheme(): 'light' | 'dark' {
    return (localStorage.getItem(KEYS.THEME) as 'light' | 'dark') ?? 'light';
  },

  saveTheme(theme: 'light' | 'dark'): void {
    localStorage.setItem(KEYS.THEME, theme);
  }
};
