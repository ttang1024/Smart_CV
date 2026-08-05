import type { ComponentType, CSSProperties } from 'react';
import {
  FileText, Download, Shield, Palette, Brain, Lock,
  Upload, Wand2, LayoutTemplate, Files, Mail, MessageSquareText,
  SpellCheck, Send, Languages,
} from 'lucide-react';
import { type AIProviderType } from '../../types/ai';
import {
  OpenAILogo, GeminiLogo, ClaudeLogo, GrokLogo,
  DeepSeekLogo, QianwenLogo, KimiLogo, DoubaoLogo, WenyanyixinLogo,
} from '../ui/AIProviderLogos';
import type { Translate } from './i18n';

export const GITHUB_URL = 'https://github.com/ttang1024/Smart_CV';

const STEP_COLORS = [
  'from-emerald-500 to-green-500',
  'from-green-500 to-teal-500',
  'from-teal-500 to-emerald-600',
  'from-emerald-400 to-green-600',
] as const;

const STEP_ICONS = [Upload, Wand2, LayoutTemplate, Download] as const;

export const AI_PROVIDER_ORDER: AIProviderType[] = [
  'openai', 'gemini', 'claude', 'grok', 'qianwen', 'deepseek',
];

export const AI_PROVIDER_ACCESS: Record<AIProviderType, { keyHint: string; free: string; url: string }> = {
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

export const AI_PROVIDER_LOGOS: Record<AIProviderType, ComponentType<{ className?: string; style?: CSSProperties }>> = {
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

export function buildSteps(t: Translate) {
  return [
    { icon: STEP_ICONS[0], n: '1', title: t('landing.howItWorks.steps.step1.title'), desc: t('landing.howItWorks.steps.step1.desc'), color: STEP_COLORS[0] },
    { icon: STEP_ICONS[1], n: '2', title: t('landing.howItWorks.steps.step2.title'), desc: t('landing.howItWorks.steps.step2.desc'), color: STEP_COLORS[1] },
    { icon: STEP_ICONS[2], n: '3', title: t('landing.howItWorks.steps.step3.title'), desc: t('landing.howItWorks.steps.step3.desc'), color: STEP_COLORS[2] },
    { icon: STEP_ICONS[3], n: '4', title: t('landing.howItWorks.steps.step4.title'), desc: t('landing.howItWorks.steps.step4.desc'), color: STEP_COLORS[3] },
  ];
}

export function buildHeroFeatures(t: Translate) {
  return [
    { icon: Palette, text: t('landing.hero.features.styles') },
    { icon: Brain, text: t('landing.hero.features.aiProviders') },
    { icon: Lock, text: t('landing.hero.features.private') },
    { icon: Shield, text: t('landing.hero.features.noSignup') },
    { icon: Download, text: t('landing.hero.features.downloads') },
    { icon: FileText, text: t('landing.hero.features.ats') },
  ];
}

export function buildFunctions(t: Translate) {
  return [
    {
      type: 'pdf',
      icon: Upload,
      title: t('landing.functions.items.pdfImport.title'),
      desc: t('landing.functions.items.pdfImport.desc'),
      iconGrad: 'from-rose-400 to-rose-600',
      border: '#fecdd3',
      shadow: '0 18px 60px -42px rgba(225,29,72,0.7)',
      tint: 'from-white via-white to-rose-50/60',
    },
    {
      type: 'ats',
      icon: Shield,
      title: t('landing.functions.items.atsCheck.title'),
      desc: t('landing.functions.items.atsCheck.desc'),
      iconGrad: 'from-cyan-400 to-cyan-600',
      border: '#a5f3fc',
      shadow: '0 18px 60px -42px rgba(8,145,178,0.8)',
      tint: 'from-white via-white to-cyan-50/60',
    },
    {
      type: 'optimize',
      icon: Wand2,
      title: t('landing.functions.items.aiOptimize.title'),
      desc: t('landing.functions.items.aiOptimize.desc'),
      iconGrad: 'from-teal-400 to-teal-600',
      border: '#99f6e4',
      shadow: '0 18px 60px -42px rgba(13,148,136,0.8)',
      tint: 'from-white via-white to-teal-50/60',
    },
    {
      type: 'cover',
      icon: Mail,
      title: t('landing.functions.items.coverLetter.title'),
      desc: t('landing.functions.items.coverLetter.desc'),
      iconGrad: 'from-indigo-400 to-indigo-600',
      border: '#c7d2fe',
      shadow: '0 18px 60px -42px rgba(79,70,229,0.8)',
      tint: 'from-white via-white to-indigo-50/60',
    },
    {
      type: 'interview',
      icon: MessageSquareText,
      title: t('landing.functions.items.interviewPrep.title'),
      desc: t('landing.functions.items.interviewPrep.desc'),
      iconGrad: 'from-amber-400 to-amber-600',
      border: '#fde68a',
      shadow: '0 18px 60px -42px rgba(217,119,6,0.75)',
      tint: 'from-white via-white to-amber-50/60',
    },
    {
      type: 'versions',
      icon: Files,
      title: t('landing.functions.items.jobVersions.title'),
      desc: t('landing.functions.items.jobVersions.desc'),
      iconGrad: 'from-emerald-400 to-emerald-600',
      border: '#a7f3d0',
      shadow: '0 18px 60px -42px rgba(5,150,105,0.8)',
      tint: 'from-white via-white to-emerald-50/60',
    },
    {
      type: 'proofread',
      icon: SpellCheck,
      title: t('landing.functions.items.proofread.title'),
      desc: t('landing.functions.items.proofread.desc'),
      iconGrad: 'from-sky-400 to-sky-600',
      border: '#bae6fd',
      shadow: '0 18px 60px -42px rgba(2,132,199,0.8)',
      tint: 'from-white via-white to-sky-50/60',
    },
    {
      type: 'email',
      icon: Send,
      title: t('landing.functions.items.followUpEmail.title'),
      desc: t('landing.functions.items.followUpEmail.desc'),
      iconGrad: 'from-violet-400 to-violet-600',
      border: '#ddd6fe',
      shadow: '0 18px 60px -42px rgba(124,58,237,0.8)',
      tint: 'from-white via-white to-violet-50/60',
    },
    {
      type: 'translate',
      icon: Languages,
      title: t('landing.functions.items.translate.title'),
      desc: t('landing.functions.items.translate.desc'),
      iconGrad: 'from-orange-400 to-orange-600',
      border: '#fed7aa',
      shadow: '0 18px 60px -42px rgba(234,88,12,0.75)',
      tint: 'from-white via-white to-orange-50/60',
    },
  ];
}
