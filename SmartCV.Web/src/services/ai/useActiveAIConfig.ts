import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AI_PROVIDER_CONFIGS } from '../../types/ai';
import { useSettingsStore, type ActiveAIConfig } from '../../store/settingsStore';

/**
 * The active AI provider config for panels that call the AI, plus the message to show
 * when no API key is set for it.
 */
export function useActiveAIConfig() {
  const { t } = useTranslation();
  const activeProvider = useSettingsStore(state => state.aiSettings.activeProvider);
  const providerSettings = useSettingsStore(state => state.aiSettings.providers[state.aiSettings.activeProvider]);
  const meta = AI_PROVIDER_CONFIGS[activeProvider];

  const config = useMemo<ActiveAIConfig | null>(() => (
    providerSettings?.apiKey
      ? { provider: activeProvider, apiKey: providerSettings.apiKey, model: providerSettings.model || meta.defaultModel }
      : null
  ), [activeProvider, providerSettings, meta.defaultModel]);

  return {
    config,
    activeProvider,
    providerName: meta.name,
    missingKeyMessage: t('app.ai.missingKey', { provider: meta.name }),
  };
}
