import type { ComponentType, CSSProperties } from 'react';
import Link from 'next/link';
import {
  Sparkles, FileText, Download, Shield, Palette,
  ArrowRight, ExternalLink, Brain, Lock,
  Upload, Wand2, LayoutTemplate,
  Terminal, KeyRound, SlidersHorizontal,
} from 'lucide-react';
import { GithubFilled } from '@ant-design/icons';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';
import ResumeHeroPreview from '../components/landing/ResumeHeroPreview';
import { getDemoResume } from '../data/demoResume';
import { AI_PROVIDER_CONFIGS, type AIProviderType } from '../types/ai';
import {
  OpenAILogo, GeminiLogo, ClaudeLogo, GrokLogo,
  DeepSeekLogo, QianwenLogo, KimiLogo, DoubaoLogo, WenyanyixinLogo,
} from '../components/ui/AIProviderLogos';
import en from '../i18n/locales/en';
import es from '../i18n/locales/es';
import zhCN from '../i18n/locales/zh-CN';
import zhTW from '../i18n/locales/zh-TW';

const GITHUB_URL = 'https://github.com/ttang1024/Smart_CV';

const LANDING_MESSAGES = {
  en,
  es,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
} as const;

export type LandingLanguage = keyof typeof LANDING_MESSAGES;

type LandingMessages = Record<string, unknown>;
type TranslationParams = Record<string, string | number>;

const STEP_COLORS = [
  'from-emerald-500 to-green-500',
  'from-green-500 to-teal-500',
  'from-teal-500 to-emerald-600',
  'from-emerald-400 to-green-600',
] as const;

const STEP_ICONS = [Upload, Wand2, LayoutTemplate, Download] as const;

const DEPLOYMENT_LINES = [
  { prompt: '~', cmd: 'git clone https://github.com/ttang1024/Smart_CV', color: '#4ade80' },
  { prompt: '~', cmd: 'cd Smart_CV', color: '#4ade80' },
  { prompt: '~/Smart_CV/SmartCV.API', cmd: 'dotnet run', color: '#22d3ee' },
  { prompt: null, cmd: '✓ API -> http://localhost:5100', color: '#818cf8' },
  { prompt: '~/Smart_CV/SmartCV.Web', cmd: 'npm install && npm run dev', color: '#4ade80' },
  { prompt: null, cmd: '✓ Web -> http://localhost:3000', color: '#818cf8' },
];

const AI_PROVIDER_ORDER: AIProviderType[] = [
  'openai', 'gemini', 'claude', 'grok', 'qianwen', 'deepseek',
];

const AI_PROVIDER_ACCESS: Record<AIProviderType, { keyHint: string; free: string; url: string }> = {
  openai: { keyHint: 'sk-...', free: 'Pay-as-you-go', url: 'https://platform.openai.com/api-keys' },
  gemini: { keyHint: 'AIza...', free: 'Free tier', url: 'https://aistudio.google.com/app/apikey' },
  claude: { keyHint: 'sk-ant-...', free: 'Free tier', url: 'https://console.anthropic.com/settings/keys' },
  grok: { keyHint: 'xai-...', free: 'Free tier', url: 'https://console.x.ai' },
  deepseek: { keyHint: 'sk-...', free: 'Low cost', url: 'https://platform.deepseek.com/api_keys' },
  qianwen: { keyHint: 'sk-...', free: 'Free credits', url: 'https://dashscope.aliyuncs.com' },
  kimi: { keyHint: 'sk-...', free: 'Free credits', url: 'https://platform.moonshot.cn/console/api-keys' },
  doubao: { keyHint: 'custom', free: 'Low cost', url: 'https://console.volcengine.com/ark' },
  wenyanyixin: { keyHint: 'bce-v3/...', free: 'Free tier', url: 'https://console.bce.baidu.com/qianfan' },
};

const AI_PROVIDER_LOGOS: Record<AIProviderType, ComponentType<{ className?: string; style?: CSSProperties }>> = {
  openai: OpenAILogo,
  gemini: GeminiLogo,
  claude: ClaudeLogo,
  grok: GrokLogo,
  deepseek: DeepSeekLogo,
  qianwen: QianwenLogo,
  kimi: KimiLogo,
  doubao: DoubaoLogo,
  wenyanyixin: WenyanyixinLogo,
};

function readTranslation(messages: LandingMessages, key: string): string {
  const value = key.split('.').reduce<unknown>((current, part) => (
    current && typeof current === 'object'
      ? (current as Record<string, unknown>)[part]
      : undefined
  ), messages);

  return typeof value === 'string' ? value : key;
}

function translate(messages: LandingMessages, key: string, params?: TranslationParams) {
  const value = readTranslation(messages, key);

  if (!params) {
    return value;
  }

  return Object.entries(params).reduce(
    (text, [param, replacement]) => text.replaceAll(`{{${param}}}`, String(replacement)),
    value,
  );
}

export default function LandingPage({ initialLanguage = 'en' }: { initialLanguage?: LandingLanguage }) {
  const messages = LANDING_MESSAGES[initialLanguage];
  const t = (key: string, params?: TranslationParams) => translate(messages, key, params);
  const demoResume = getDemoResume(initialLanguage);
  const aiRulesTitle = t('landing.aiRules.title');
  const [aiRulesTitleLead, ...aiRulesTitleRest] = aiRulesTitle.split(',');

  const steps = [
    { icon: STEP_ICONS[0], n: '1', title: t('landing.howItWorks.steps.step1.title'), desc: t('landing.howItWorks.steps.step1.desc'), color: STEP_COLORS[0] },
    { icon: STEP_ICONS[1], n: '2', title: t('landing.howItWorks.steps.step2.title'), desc: t('landing.howItWorks.steps.step2.desc'), color: STEP_COLORS[1] },
    { icon: STEP_ICONS[2], n: '3', title: t('landing.howItWorks.steps.step3.title'), desc: t('landing.howItWorks.steps.step3.desc'), color: STEP_COLORS[2] },
    { icon: STEP_ICONS[3], n: '4', title: t('landing.howItWorks.steps.step4.title'), desc: t('landing.howItWorks.steps.step4.desc'), color: STEP_COLORS[3] },
  ];

  const heroFeatures = [
    { icon: Palette, text: t('landing.hero.features.styles') },
    { icon: Brain, text: t('landing.hero.features.aiProviders') },
    { icon: Lock, text: t('landing.hero.features.private') },
    { icon: Shield, text: t('landing.hero.features.noSignup') },
    { icon: Download, text: t('landing.hero.features.downloads') },
    { icon: FileText, text: t('landing.hero.features.ats') },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-clip">
      <div
        className="fixed inset-0 -z-20 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, #d1fae5 1px, transparent 1px)', backgroundSize: '32px 32px', opacity: 0.4 }}
      />

      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/60 shadow-sm">
        <div className="max-w-6xl mx-auto h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-gray-900 shrink-0">
            <img src="/favicon.svg" alt="SmartCV" className="w-8 h-8" />
            <span className="text-lg tracking-tight">Smart<span className="text-emerald-600">CV</span></span>
          </Link>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 bg-white px-3 py-1.5 rounded-lg transition-all"
            >
              <GithubFilled />
              <span className="font-medium">{t('landing.nav.github')}</span>
            </a>
            <Link href="/app" className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-md shadow-emerald-200 transition-colors">
              {t('landing.nav.getStarted')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative pt-16 pb-16 px-6 overflow-x-clip">
        <div className="absolute -top-48 -right-48 w-[700px] h-[700px] bg-emerald-100 rounded-full blur-3xl -z-10 opacity-60" />
        <div className="absolute top-56 -left-48 w-[600px] h-[600px] bg-green-100 rounded-full blur-3xl -z-10 opacity-50" />

        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 mb-8">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white border border-gray-200 shadow-sm text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full hover:border-emerald-300 transition-all"
              >
                <GithubFilled /> {t('landing.hero.openSource')} <ExternalLink className="w-3 h-3 text-gray-400" />
              </a>
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                <Sparkles className="w-3 h-3" /> {t('landing.hero.freeBadge')}
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.08] mb-6">
              <span className="block text-gray-900">{t('landing.hero.headline1')}</span>
              <span className="block bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500 bg-clip-text text-transparent pb-1">
                {t('landing.hero.headline2')}
              </span>
            </h1>

            <p className="text-lg text-gray-500 mb-8 leading-relaxed max-w-lg">
              {t('landing.hero.subheadline')}
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-3 mb-10">
              <Link href="/app" className="inline-flex items-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-4 rounded-xl shadow-xl shadow-emerald-300/40 transition-colors text-base">
                {t('landing.hero.ctaFree')}
              </Link>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-bold px-8 py-4 rounded-xl shadow-sm hover:shadow-md transition-all text-base"
              >
                <GithubFilled /> {t('landing.hero.ctaGithub')}
              </a>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
              {heroFeatures.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50 shrink-0">
                    <Icon className="w-3 h-3 text-emerald-500" />
                  </span>
                  {text}
                </div>
              ))}
            </div>
          </div>

          <ResumeHeroPreview resume={demoResume} language={initialLanguage} />
        </div>
      </section>

      <section className="relative py-24 px-6 overflow-x-clip text-gray-900">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24" style={{ background: 'linear-gradient(to bottom, transparent, rgba(16,185,129,0.35), transparent)' }} />

        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.18em] uppercase mb-3 px-3 py-1 rounded-full" style={{ background: '#ecfdf5', border: '1px solid #d1fae5', color: '#059669' }}>
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {t('landing.aiRules.label')}
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold leading-tight mt-2 mb-4">
              <span style={{ background: 'linear-gradient(135deg, #4ade80, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {aiRulesTitleLead}{aiRulesTitleRest.length ? ',' : ''}
              </span>{' '}
              <span style={{ background: 'linear-gradient(135deg, #22d3ee, #14b8a6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {aiRulesTitleRest.join(',').trim()}
              </span>
            </h2>
            <p className="text-gray-500 text-lg leading-relaxed max-w-2xl mx-auto">{t('landing.aiRules.subtitle')}</p>
          </div>

          <div className="relative grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
            <div className="lg:col-span-2">
              <div className="flex flex-col gap-4">
                <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(0,0,0,1)', border: '1px solid rgba(74,222,128,0.2)', boxShadow: '0 0 40px rgba(74,222,128,0.06)' }}>
                  <div className="flex items-center gap-2 px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="w-3 h-3 rounded-full bg-red-500/70" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                    <div className="w-3 h-3 rounded-full bg-green-500/70" />
                    <Terminal className="w-3.5 h-3.5 text-white/20 ml-2" />
                    <span className="text-xs text-white/20 ml-1">bash</span>
                    <div className="ml-auto flex gap-1">
                      <span className="text-xs px-2.5 py-0.5 rounded-md font-semibold" style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}>
                        {t('landing.aiRules.deployTabs.local')}
                      </span>
                      {(['docker', 'azure'] as const).map(tab => (
                        <span key={tab} className="text-xs px-2.5 py-0.5 rounded-md font-semibold" style={{ background: 'transparent', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          {t(`landing.aiRules.deployTabs.${tab}`)}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="px-5 py-5 font-mono text-sm space-y-2 min-h-[276px]">
                    {DEPLOYMENT_LINES.map((line, index) => (
                      <div key={`${line.cmd}-${index}`} className="flex items-start gap-2">
                        {line.prompt && <span className="shrink-0 text-white/25">{line.prompt} $</span>}
                        <span className="break-all" style={{ color: line.color }}>{line.cmd}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-white/25">~ $</span>
                      <span style={{ color: '#4ade80' }}>|</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    { label: t('landing.aiRules.badges.mit'), color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
                    { label: t('landing.aiRules.badges.selfHost'), color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
                    { label: t('landing.aiRules.badges.noSubscriptions'), color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe' },
                  ].map(badge => (
                    <span key={badge.label} className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                      {badge.label}
                    </span>
                  ))}
                </div>

                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2.5 py-3 px-5 rounded-xl font-bold text-sm" style={{ background: '#ffffff', border: '1px solid #d1fae5', color: '#059669', boxShadow: '0 16px 40px -28px rgba(5,150,105,0.9)' }}>
                  <GithubFilled />
                  GitHub
                  <span className="text-xs text-gray-400 font-normal">-&gt; {t('landing.aiRules.githubFree')}</span>
                </a>
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: '#ffffff', border: '1px solid #e5e7eb', boxShadow: '0 18px 50px -38px rgba(15,23,42,0.45)' }}>
                  <KeyRound className="w-4 h-4 text-cyan-400 shrink-0" />
                  <p className="text-sm text-gray-500">
                    {t('landing.aiRules.keyInstructionPrefix')}{' '}
                    <span className="text-cyan-600 font-semibold">{t('landing.aiRules.keyInstructionTarget')}</span>.
                    {' '}{t('landing.aiRules.keyInstructionSuffix')}
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {AI_PROVIDER_ORDER.map(provider => {
                    const meta = AI_PROVIDER_CONFIGS[provider];
                    const access = AI_PROVIDER_ACCESS[provider];
                    const Logo = AI_PROVIDER_LOGOS[provider];

                    return (
                      <div key={provider} className="relative flex h-full flex-col gap-2 p-4 rounded-xl cursor-default" style={{ background: '#ffffff', border: `1px solid ${meta.color}26`, borderLeft: `3px solid ${meta.color}`, boxShadow: '0 16px 45px -36px rgba(15,23,42,0.55)' }}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0">
                              <Logo className="w-6 h-6" style={{ color: meta.color }} />
                            </div>
                            <span className="text-sm font-bold truncate" style={{ color: meta.color }}>{meta.name}</span>
                          </div>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: `${meta.color}18`, color: meta.color }}>
                            {access.free}
                          </span>
                        </div>

                        <div className="font-mono text-xs rounded px-2 py-1" style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e5e7eb' }}>
                          {access.keyHint}
                        </div>

                        <div className="flex items-center justify-between gap-3 mt-auto">
                          <span className="text-[10px] text-gray-400 truncate">{meta.defaultModel}</span>
                          <a href={access.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 text-[10px] font-semibold transition-colors hover:opacity-80 shrink-0" style={{ color: meta.color }}>
                            {t('landing.aiRules.getKey')} <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400 text-center">{t('landing.aiRules.privacy')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-24 px-6 bg-gradient-to-b from-white to-slate-50 overflow-x-clip">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <span className="inline-block text-xs font-bold text-emerald-600 tracking-[0.2em] uppercase mb-3 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">{t('landing.howItWorks.label')}</span>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mt-2 mb-4">{t('landing.howItWorks.title')}</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">{t('landing.howItWorks.subtitle')}</p>
          </div>

          <div className="relative">
            <div className="hidden lg:block absolute top-11 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-emerald-300 via-green-300 to-teal-300" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
              {steps.map(step => (
                <div key={step.n} className="flex flex-col items-center text-center">
                  <div className="relative z-10 cursor-pointer mb-5">
                    <div className={`w-[88px] h-[88px] rounded-3xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-xl`}>
                      <step.icon className="w-9 h-9 text-white" strokeWidth={1.8} />
                    </div>
                    <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${step.color} blur-xl -z-10 opacity-20`} />
                  </div>

                  <h3 className="font-bold text-gray-900 mb-2 leading-snug">{step.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 bg-[#0f0c29] px-26 py-8">
        <div className="border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white">
          <p>{t('landing.footer.copy', { year: new Date().getFullYear() })}</p>
          <p>{t('landing.footer.tagline')}</p>
          <Link href="/app" className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
            {t('landing.footer.openApp')} <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </footer>
    </div>
  );
}
