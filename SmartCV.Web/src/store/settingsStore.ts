import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { AISettings, AIProviderType } from '../types/ai';
import { AI_PROVIDER_CONFIGS } from '../types/ai';
import { settingsStorage } from '../services/storage/localStorage';

interface SettingsState {
  aiSettings: AISettings;

  setActiveProvider: (provider: AIProviderType) => void;
  setAPIKey: (provider: AIProviderType, key: string) => void;
  setModel: (provider: AIProviderType, model: string) => void;

  getActiveConfig: () => { provider: AIProviderType; apiKey: string; model: string } | null;
}

export const useSettingsStore = create<SettingsState>()(
  subscribeWithSelector((set, get) => ({
    aiSettings: settingsStorage.getAISettings(),

    setActiveProvider: (provider) => {
      set(state => {
        const updated = { ...state.aiSettings, activeProvider: provider };
        settingsStorage.saveAISettings(updated);
        return { aiSettings: updated };
      });
    },

    setAPIKey: (provider, key) => {
      set(state => {
        const existing = state.aiSettings.providers[provider];
        const updated = {
          ...state.aiSettings,
          providers: {
            ...state.aiSettings.providers,
            [provider]: {
              model: AI_PROVIDER_CONFIGS[provider].defaultModel,
              ...existing,
              apiKey: key
            }
          }
        };
        settingsStorage.saveAISettings(updated);
        return { aiSettings: updated };
      });
    },

    setModel: (provider, model) => {
      set(state => {
        const updated = {
          ...state.aiSettings,
          providers: {
            ...state.aiSettings.providers,
            [provider]: { ...state.aiSettings.providers[provider], model }
          }
        };
        settingsStorage.saveAISettings(updated);
        return { aiSettings: updated };
      });
    },

    getActiveConfig: () => {
      const { aiSettings } = get();
      const provider = aiSettings.activeProvider;
      const config = aiSettings.providers[provider];
      if (!config.apiKey) return null;
      return { provider, apiKey: config.apiKey, model: config.model };
    }
  }))
);
