import { create } from 'zustand';
import type { AISettings, AIProviderType } from '../types/ai';
import { AI_PROVIDER_CONFIGS } from '../types/ai';
import { settingsStorage } from '../services/storage/localStorage';

export interface ActiveAIConfig {
  provider: AIProviderType;
  apiKey: string;
  model: string;
}

interface SettingsState {
  aiSettings: AISettings;

  setActiveProvider: (provider: AIProviderType) => void;
  setAPIKey: (provider: AIProviderType, key: string) => void;
  setModel: (provider: AIProviderType, model: string) => void;
  setUseAI: (useAI: boolean) => void;

  getActiveConfig: () => ActiveAIConfig | null;
}

export const useSettingsStore = create<SettingsState>()((set, get) => {
  const update = (change: (settings: AISettings) => AISettings) =>
    set(state => {
      const aiSettings = change(state.aiSettings);
      settingsStorage.saveAISettings(aiSettings);
      return { aiSettings };
    });

  const updateProvider = (provider: AIProviderType, patch: Partial<AISettings['providers'][AIProviderType]>) =>
    update(settings => {
      const existing = settings.providers[provider];
      return {
        ...settings,
        providers: {
          ...settings.providers,
          [provider]: {
            apiKey: existing?.apiKey ?? '',
            model: existing?.model ?? AI_PROVIDER_CONFIGS[provider].defaultModel,
            ...patch,
          },
        },
      };
    });

  return {
    aiSettings: settingsStorage.getAISettings(),

    setActiveProvider: provider => update(settings => ({ ...settings, activeProvider: provider })),
    setAPIKey: (provider, apiKey) => updateProvider(provider, { apiKey }),
    setModel: (provider, model) => updateProvider(provider, { model }),
    setUseAI: useAI => update(settings => ({ ...settings, useAI })),

    getActiveConfig: () => {
      const { aiSettings } = get();
      const provider = aiSettings.activeProvider;
      const config = aiSettings.providers[provider];
      if (!config?.apiKey) return null;
      return { provider, apiKey: config.apiKey, model: config.model || AI_PROVIDER_CONFIGS[provider].defaultModel };
    },
  };
});
