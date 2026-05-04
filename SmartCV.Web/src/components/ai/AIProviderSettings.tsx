import { useState } from 'react';
import { Eye, EyeOff, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AIProviderType } from '../../types/ai';
import { AI_PROVIDER_CONFIGS } from '../../types/ai';
import { useSettingsStore } from '../../store/settingsStore';
import { OpenAILogo, GeminiLogo, ClaudeLogo, GrokLogo, DeepSeekLogo, QianwenLogo, KimiLogo, DoubaoLogo, WenyanyixinLogo } from '../ui/AIProviderLogos';
import Input from '../ui/Input';
import Button from '../ui/Button';

const PROVIDER_MODEL_HINTS: Record<AIProviderType, string> = {
  openai: 'e.g. gpt-4o, gpt-4o-mini, o1',
  gemini: 'e.g. gemini-2.5-pro, gemini-2.0-flash',
  claude: 'e.g. claude-opus-4-7, claude-sonnet-4-6',
  grok: 'e.g. grok-3, grok-3-mini',
  deepseek: 'e.g. deepseek-v4-flash, deepseek-v4-pro, deepseek-reasoner',
  qianwen: 'e.g. qwen-plus, qwen-max, qwen-turbo',
  kimi: 'e.g. moonshot-v1-32k, moonshot-v1-128k, kimi-k2-0711-preview',
  doubao: 'e.g. doubao-pro-32k, doubao-lite-32k',
  wenyanyixin: 'e.g. ernie-4.0-8k, ernie-speed-128k',
};

const PROVIDER_LOGOS: Record<AIProviderType, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  openai: OpenAILogo,
  gemini: GeminiLogo,
  claude: ClaudeLogo,
  grok: GrokLogo,
  deepseek: DeepSeekLogo,
  qianwen: QianwenLogo,
  kimi: KimiLogo,
  doubao: DoubaoLogo,
  wenyanyixin: WenyanyixinLogo
};

export default function AIProviderSettings() {
  const { aiSettings, setActiveProvider, setAPIKey, setModel, setUseAI } = useSettingsStore();
  const { t } = useTranslation();
  const [showKeys, setShowKeys] = useState<Record<AIProviderType, boolean>>({
    openai: false, gemini: false, claude: false, grok: false,
    deepseek: false,
    qianwen: false, kimi: false, doubao: false, wenyanyixin: false
  });

  const providers: AIProviderType[] = ['openai', 'gemini', 'claude', 'grok', 'deepseek', 'qianwen',
    // 'kimi', 'doubao','wenyanyixin'
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{t('aiSettings.title')}</h2>
        <p className="text-sm text-gray-500 mt-1">
          {t('aiSettings.subtitle')}
        </p>
      </div>

      <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-white">
        <div>
          <p className="text-sm font-medium text-gray-900">{t('aiSettings.useAILabel')}</p>
          <p className="text-xs text-gray-500 mt-0.5">{t('aiSettings.useAIDesc')}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={aiSettings.useAI}
          onClick={() => setUseAI(!aiSettings.useAI)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${aiSettings.useAI ? 'bg-emerald-600' : 'bg-gray-200'
            }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${aiSettings.useAI ? 'translate-x-5' : 'translate-x-0'
              }`}
          />
        </button>
      </div>

      <div className="space-y-3">
        {providers.map(provider => {
          const meta = AI_PROVIDER_CONFIGS[provider];
          const config = aiSettings.providers[provider];
          const isActive = aiSettings.activeProvider === provider;
          const hasKey = !!config.apiKey;
          const Logo = PROVIDER_LOGOS[provider];

          return (
            <div
              key={provider}
              className={`rounded-xl border-2 p-4 transition-all ${isActive
                ? 'border-emerald-500 bg-emerald-50/50'
                : 'border-gray-200 bg-white'
                }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  >
                    <Logo className="w-7 h-7" style={{ color: meta.color }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{meta.name}</h3>
                    <span className="text-xs flex items-center gap-1">
                      {hasKey
                        ? <span className="text-emerald-600 flex items-center gap-1"><Check className="w-3 h-3" />{t('aiSettings.keyConfigured')}</span>
                        : <span className="text-gray-400">{t('aiSettings.noKey')}</span>
                      }
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={isActive ? 'primary' : 'outline'}
                  onClick={() => setActiveProvider(provider)}
                  disabled={isActive}
                >
                  {isActive ? t('aiSettings.active') : t('aiSettings.select')}
                </Button>
              </div>

              {/* API Key */}
              <div className="relative">
                <Input
                  label={t('aiSettings.apiKeyLabel')}
                  type={showKeys[provider] ? 'text' : 'password'}
                  value={config.apiKey}
                  onChange={e => setAPIKey(provider, e.target.value.trim())}
                  placeholder={t('aiSettings.apiKeyPlaceholder', { name: meta.name })}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }))}
                  className="absolute right-2 top-7 text-gray-400 hover:text-gray-600"
                >
                  {showKeys[provider] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Model input */}
              <div className="mt-3">
                <Input
                  label={t('aiSettings.modelLabel')}
                  value={config.model}
                  onChange={e => setModel(provider, e.target.value)}
                  placeholder={meta.defaultModel}
                />
                <p className="text-xs text-gray-400 mt-1">{PROVIDER_MODEL_HINTS[provider]}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
        <strong>{t('aiSettings.privacyLabel')}</strong> {t('aiSettings.privacy')}
      </div>
    </div>
  );
}
