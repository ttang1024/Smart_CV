import { beforeEach, describe, expect, it } from 'vitest';
import { defaultAISettings, settingsStorage } from './localStorage';

describe('settingsStorage', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips settings including API keys', () => {
    const settings = defaultAISettings();
    settings.providers.openai.apiKey = 'sk-test';
    settings.activeProvider = 'claude';

    settingsStorage.saveAISettings(settings);

    expect(settingsStorage.getAISettings()).toEqual(settings);
  });

  it('fills in providers missing from older saved settings', () => {
    localStorage.setItem('smartcv_ai_settings', JSON.stringify({ activeProvider: 'gemini', providers: { gemini: { apiKey: 'k', model: 'gemini-x' } } }));

    const settings = settingsStorage.getAISettings();

    expect(settings.providers.gemini).toEqual({ apiKey: 'k', model: 'gemini-x' });
    expect(settings.providers.openai.model).toBe(defaultAISettings().providers.openai.model);
  });

  it('falls back to defaults when stored settings are corrupt', () => {
    localStorage.setItem('smartcv_ai_settings', '{broken');

    expect(settingsStorage.getAISettings()).toEqual(defaultAISettings());
  });
});
