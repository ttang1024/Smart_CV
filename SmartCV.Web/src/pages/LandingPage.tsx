import { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TemplatePreview, deriveTheme } from '../components/resume/ResumePreview';
import { DEMO_RESUME } from '../data/demoResume';
import {
  motion, useInView, useMotionValue, useSpring,
  useTransform, AnimatePresence,
} from 'framer-motion';
import {
  Sparkles, FileText, Download, Zap, Shield, Palette,
  ArrowRight, Check, Star, ExternalLink, Brain, Lock,
  ChevronDown, Upload, Wand2, LayoutTemplate, Plus, Minus,
  Terminal, KeyRound, SlidersHorizontal,
} from 'lucide-react';
import { GithubFilled } from '@ant-design/icons';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';
import { AI_PROVIDER_CONFIGS, type AIProviderType } from '../types/ai';
import {
  OpenAILogo, GeminiLogo, ClaudeLogo, GrokLogo,
  QianwenLogo, KimiLogo, DoubaoLogo, WenyanyixinLogo,
} from '../components/ui/AIProviderLogos';


// ─── constants ────────────────────────────────────────────────────────────────
const GITHUB_URL = 'https://github.com/ttang1024/Smart_CV';

// ─── animation presets ───────────────────────────────────────────────────────
const spring = { type: 'spring' as const, stiffness: 260, damping: 24 };

const fadeUp = {
  hidden: { opacity: 0, y: 28, filter: 'blur(4px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};


function stagger(d = 0.08) {
  return { hidden: {}, show: { transition: { staggerChildren: d } } };
}

// ─── helpers ─────────────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref} variants={fadeUp} initial="hidden" animate={inView ? 'show' : 'hidden'} transition={{ delay }} className={className}>
      {children}
    </motion.div>
  );
}


function TiltCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotX = useSpring(useTransform(y, [-0.5, 0.5], [5, -5]), { stiffness: 300, damping: 30 });
  const rotY = useSpring(useTransform(x, [-0.5, 0.5], [-5, 5]), { stiffness: 300, damping: 30 });
  return (
    <motion.div
      ref={ref}
      onMouseMove={e => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        x.set((e.clientX - r.left) / r.width - 0.5);
        y.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      style={{ rotateX: rotX, rotateY: rotY, transformStyle: 'preserve-3d' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── data ─────────────────────────────────────────────────────────────────────

const HERO_SCALE = 0.54;

const STEP_COLORS = [
  'from-emerald-500 to-green-500',
  'from-green-500 to-teal-500',
  'from-teal-500 to-emerald-600',
  'from-emerald-400 to-green-600',
] as const;

const STEP_ICONS = [Upload, Wand2, LayoutTemplate, Download] as const;
type DeployTab = 'local' | 'docker' | 'azure';

const DEPLOYMENT_LINES: Record<DeployTab, { prompt: string | null; cmd: string; color: string }[]> = {
  local: [
    { prompt: '~', cmd: 'git clone https://github.com/ttang1024/Smart_CV', color: '#4ade80' },
    { prompt: '~', cmd: 'cd Smart_CV', color: '#4ade80' },
    { prompt: '~/Smart_CV/SmartCV.API', cmd: 'dotnet run', color: '#22d3ee' },
    { prompt: null, cmd: '✓ API → http://localhost:5100', color: '#818cf8' },
    { prompt: '~/Smart_CV/SmartCV.Web', cmd: 'npm install && npm run dev', color: '#4ade80' },
    { prompt: null, cmd: '✓ Web → http://localhost:5173', color: '#818cf8' },
  ],
  docker: [
    { prompt: '~', cmd: 'git clone https://github.com/ttang1024/Smart_CV', color: '#4ade80' },
    { prompt: '~', cmd: 'cd Smart_CV', color: '#4ade80' },
    { prompt: '~/Smart_CV', cmd: 'docker build -t smart-cv .', color: '#22d3ee' },
    { prompt: '~/Smart_CV', cmd: 'docker run -p 8080:8080 smart-cv', color: '#22d3ee' },
    { prompt: null, cmd: '✓ SmartCV → http://localhost:8080', color: '#818cf8' },
  ],
  azure: [
    { prompt: '~', cmd: 'az login', color: '#38bdf8' },
    { prompt: '~/Smart_CV', cmd: 'export AZURE_LOCATION=eastus', color: '#4ade80' },
    { prompt: '~/Smart_CV', cmd: './deploy.sh latest', color: '#22d3ee' },
    { prompt: null, cmd: '✓ Azure Container App is live', color: '#818cf8' },
  ],
};

const AI_PROVIDER_ORDER: AIProviderType[] = [
  'openai', 'gemini', 'claude', 'grok', 'qianwen',
  //  'kimi', 'doubao', 'wenyanyixin',
];

const AI_PROVIDER_ACCESS: Record<AIProviderType, { keyHint: string; free: string; url: string }> = {
  openai: { keyHint: 'sk-...', free: 'Pay-as-you-go', url: 'https://platform.openai.com/api-keys' },
  gemini: { keyHint: 'AIza...', free: 'Free tier', url: 'https://aistudio.google.com/app/apikey' },
  claude: { keyHint: 'sk-ant-...', free: 'Free tier', url: 'https://console.anthropic.com/settings/keys' },
  grok: { keyHint: 'xai-...', free: 'Free tier', url: 'https://console.x.ai' },
  qianwen: { keyHint: 'sk-...', free: 'Free credits', url: 'https://dashscope.aliyuncs.com' },
  kimi: { keyHint: 'sk-...', free: 'Free credits', url: 'https://platform.moonshot.cn/console/api-keys' },
  doubao: { keyHint: 'custom', free: 'Low cost', url: 'https://console.volcengine.com/ark' },
  wenyanyixin: { keyHint: 'bce-v3/...', free: 'Free tier', url: 'https://console.bce.baidu.com/qianfan' },
};

const AI_PROVIDER_LOGOS: Record<AIProviderType, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  openai: OpenAILogo,
  gemini: GeminiLogo,
  claude: ClaudeLogo,
  grok: GrokLogo,
  qianwen: QianwenLogo,
  kimi: KimiLogo,
  doubao: DoubaoLogo,
  wenyanyixin: WenyanyixinLogo,
};

const RESUME_STYLES = [
  { id: 'classic', name: 'Classic', accent: '#059669' },
  { id: 'modern', name: 'Modern', accent: '#0d9488' },
  { id: 'executive', name: 'Executive', accent: '#1e40af' },
  { id: 'minimal', name: 'Minimal', accent: '#6b7280' },
  { id: 'creative', name: 'Creative', accent: '#f59e0b' },
  { id: 'elegant', name: 'Elegant', accent: '#b5914a' },
  { id: 'academic', name: 'Academic', accent: '#7c3aed' },
  { id: 'split', name: 'Split', accent: '#0891b2' },
  { id: 'timeline', name: 'Timeline', accent: '#059669' },
  { id: 'custom', name: '✦ Custom', accent: '#e11d48' },
];

// ─── page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [heroStyleIdx, setHeroStyleIdx] = useState(0);
  const [heroAccent, setHeroAccent] = useState('#059669');
  const [deployTab, setDeployTab] = useState<DeployTab>('local');

  const STEPS = [
    { icon: STEP_ICONS[0], n: '1', title: t('landing.howItWorks.steps.step1.title'), desc: t('landing.howItWorks.steps.step1.desc'), color: STEP_COLORS[0] },
    { icon: STEP_ICONS[1], n: '2', title: t('landing.howItWorks.steps.step2.title'), desc: t('landing.howItWorks.steps.step2.desc'), color: STEP_COLORS[1] },
    { icon: STEP_ICONS[2], n: '3', title: t('landing.howItWorks.steps.step3.title'), desc: t('landing.howItWorks.steps.step3.desc'), color: STEP_COLORS[2] },
    { icon: STEP_ICONS[3], n: '4', title: t('landing.howItWorks.steps.step4.title'), desc: t('landing.howItWorks.steps.step4.desc'), color: STEP_COLORS[3] },
  ];

  const HERO_FEATURES = [
    { icon: Palette, text: t('landing.hero.features.styles') },
    { icon: Brain, text: t('landing.hero.features.aiProviders') },
    { icon: Lock, text: t('landing.hero.features.private') },
    { icon: Shield, text: t('landing.hero.features.noSignup') },
    { icon: Download, text: t('landing.hero.features.downloads') },
    { icon: FileText, text: t('landing.hero.features.ats') },
  ];

  useEffect(() => {
    const id = setInterval(() => {
      setHeroStyleIdx(i => (i + 1) % RESUME_STYLES.length);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-clip">

      {/* dot grid */}
      <div className="fixed inset-0 -z-20 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, #d1fae5 1px, transparent 1px)', backgroundSize: '32px 32px', opacity: 0.4 }} />

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <motion.header
        initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/60 shadow-sm"
      >
        <div className="max-w-6xl mx-auto h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-gray-900 shrink-0">
            <motion.img
              src="/favicon.svg"
              alt="SmartCV"
              whileHover={{ scale: 1.1 }}
              transition={spring}
              className="w-8 h-8"
            />
            <span className="text-lg tracking-tight">Smart<span className="text-emerald-600">CV</span></span>
          </Link>

          <div className="flex items-center gap-2">
            {/* <LanguageSwitcher /> */}
            <motion.a href={GITHUB_URL} target="_blank" rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
              className="hidden sm:inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 bg-white px-3 py-1.5 rounded-lg transition-all">
              <GithubFilled />
              <span className="font-medium">{t('landing.nav.github')}</span>
            </motion.a>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link to="/app" className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-md shadow-emerald-200 transition-colors">
                {t('landing.nav.getStarted')} <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
            <button className="md:hidden p-2 rounded-lg hover:bg-gray-100" onClick={() => setMenuOpen(v => !v)} aria-label="Toggle menu">
              <motion.div animate={menuOpen ? { rotate: 45 } : { rotate: 0 }} transition={spring}>
                <ChevronDown className="w-5 h-5 text-gray-600" />
              </motion.div>
            </button>
          </div>
        </div>

        <motion.div initial={false} animate={menuOpen ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
          transition={{ duration: 0.25 }} className="overflow-hidden md:hidden border-t border-gray-100">
          <div className="px-6 py-4 space-y-1 bg-white">
            {([
              ['#how-it-works', t('landing.nav.howItWorks')],
              ['#styles', t('landing.nav.styles')],
              ['#testimonials', t('landing.nav.reviews')],
              ['#faq', t('landing.nav.faq')],
            ] as [string, string][]).map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-gray-600 hover:text-gray-900">{label}</a>
            ))}
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 py-2 text-sm text-gray-600">
              <GithubFilled className="font-medium" /> {t('landing.nav.github')}
            </a>
          </div>
        </motion.div>
      </motion.header>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative pt-16 pb-16 px-6 overflow-x-clip">
        <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.45, 0.6, 0.45] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-48 -right-48 w-[700px] h-[700px] bg-emerald-100 rounded-full blur-3xl -z-10" />
        <motion.div animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.5, 0.35] }} transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute top-56 -left-48 w-[600px] h-[600px] bg-green-100 rounded-full blur-3xl -z-10" />

        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">

          {/* ── Left: copy ── */}
          <div>
            {/* Open source pill */}
            <motion.div initial={{ opacity: 0, y: -10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 mb-8">
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white border border-gray-200 shadow-sm text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full hover:border-emerald-300 transition-all">
                <GithubFilled /> {t('landing.hero.openSource')} <ExternalLink className="w-3 h-3 text-gray-400" />
              </a>
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                <Sparkles className="w-3 h-3" /> {t('landing.hero.freeBadge')}
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1 variants={stagger(0.09)} initial="hidden" animate="show"
              className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.08] mb-6">
              <motion.span variants={fadeUp} className="block text-gray-900">{t('landing.hero.headline1')}</motion.span>
              <motion.span variants={fadeUp} className="block bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500 bg-clip-text text-transparent pb-1">
                {t('landing.hero.headline2')}
              </motion.span>
            </motion.h1>

            <Reveal delay={0.28}>
              <p className="text-lg text-gray-500 mb-8 leading-relaxed max-w-lg">
                {t('landing.hero.subheadline')}
              </p>
            </Reveal>

            {/* CTAs */}
            <Reveal delay={0.38} className="flex flex-col sm:flex-row items-start gap-3 mb-10">
              <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }} transition={spring}>
                <Link to="/app" className="inline-flex items-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-4 rounded-xl shadow-xl shadow-emerald-300/40 transition-colors text-base">
                  {t('landing.hero.ctaFree')}
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} transition={spring}>
                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-bold px-8 py-4 rounded-xl shadow-sm hover:shadow-md transition-all text-base">
                  <GithubFilled /> {t('landing.hero.ctaGithub')}
                </a>
              </motion.div>
            </Reveal>

            {/* Feature highlights */}
            <Reveal delay={0.48}>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                {HERO_FEATURES.map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50 shrink-0">
                      <Icon className="w-3 h-3 text-emerald-500" />
                    </span>
                    {text}
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          {/* ── Right: app mockup ── */}
          <Reveal delay={0.3} className="w-full">
            <TiltCard className="w-full">
              <div className="relative rounded-2xl overflow-hidden border border-gray-200/80 shadow-[0_32px_80px_-12px_rgba(5,150,105,0.18)] bg-white">
                {/* App layout: left controls + right A4 preview */}
                <div style={{ display: 'grid', gridTemplateColumns: '92px 1fr' }} className="bg-white">
                  {/* Left sidebar: style + colour controls */}
                  <div className="flex flex-col gap-3 p-2.5 border-r border-gray-100 bg-gray-50/60 overflow-y-auto">
                    {/* Style picker */}
                    <div>
                      <span className="text-[7px] font-bold text-gray-400 uppercase tracking-wide block mb-1.5">Style</span>
                      <div className="flex flex-col gap-0.5">
                        {RESUME_STYLES.map((s, i) => (
                          <button
                            key={s.id}
                            onClick={() => setHeroStyleIdx(i)}
                            className="text-[8px] font-semibold px-1.5 py-0.5 rounded text-left transition-all truncate"
                            style={i === heroStyleIdx
                              ? { background: heroAccent, color: '#fff' }
                              : { color: '#6b7280' }}>
                            {s.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Colour picker */}
                    <div>
                      <span className="text-[7px] font-bold text-gray-400 uppercase tracking-wide block mb-1.5">Color</span>
                      <input
                        type="color"
                        value={heroAccent}
                        onChange={e => setHeroAccent(e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0.5 bg-transparent"
                        title="Pick theme colour"
                      />
                    </div>
                  </div>

                  {/* Right: A4 preview */}
                  <div className="relative overflow-hidden bg-gray-50/40" style={{ aspectRatio: '210/297' }}>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={heroStyleIdx}
                        initial={{ opacity: 0, x: 24 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -24 }}
                        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                        style={{ position: 'absolute', inset: 0 }}>
                        <div style={{
                          position: 'absolute', top: 0, left: 0,
                          width: 793,
                          transform: `scale(${HERO_SCALE})`,
                          transformOrigin: 'top left',
                          pointerEvents: 'none',
                          userSelect: 'none',
                        }}>
                          <TemplatePreview
                            resume={{
                              ...DEMO_RESUME,
                              sectionOrder: [
                                'summary', 'skills', 'experience', 'education',
                                'projects', 'certifications', 'languages',
                                'achievements', 'interests', 'referees',
                              ],
                            }}
                            styleId={RESUME_STYLES[heroStyleIdx].id}
                            theme={deriveTheme(heroAccent)}
                          />
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </TiltCard>
          </Reveal>

        </div>
      </section>

      {/* ── Your AI, Your Rules ─────────────────────────────────────────────── */}
      <section
        className="relative py-24 px-6 overflow-x-clip text-gray-900"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24"
          style={{ background: 'linear-gradient(to bottom, transparent, rgba(16,185,129,0.35), transparent)' }} />

        <div className="relative max-w-6xl mx-auto">
          <Reveal className="text-center mb-14">
            <span
              className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.18em] uppercase mb-3 px-3 py-1 rounded-full"
              style={{ background: '#ecfdf5', border: '1px solid #d1fae5', color: '#059669' }}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {t('landing.aiRules.label')}
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold leading-tight mt-2 mb-4">
              <span style={{ background: 'linear-gradient(135deg, #4ade80, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {t('landing.aiRules.title').split(',')[0]},
              </span>{' '}
              <span style={{ background: 'linear-gradient(135deg, #22d3ee, #14b8a6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {t('landing.aiRules.title').split(',').slice(1).join(',').trim()}
              </span>
            </h2>
            <p className="text-gray-500 text-lg leading-relaxed max-w-2xl mx-auto">{t('landing.aiRules.subtitle')}</p>
          </Reveal>

          <div className="relative grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
            <Reveal className="lg:col-span-2">
              <div className="flex flex-col gap-4">
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(74,222,128,0.2)', boxShadow: '0 0 40px rgba(74,222,128,0.06)' }}
                >
                  <div
                    className="flex items-center gap-2 px-4 py-3"
                    style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <div className="w-3 h-3 rounded-full bg-red-500/70" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                    <div className="w-3 h-3 rounded-full bg-green-500/70" />
                    <Terminal className="w-3.5 h-3.5 text-white/20 ml-2" />
                    <span className="text-xs text-white/20 ml-1">bash</span>
                    <div className="ml-auto flex gap-1">
                      {(['local', 'docker', 'azure'] as const).map(tab => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setDeployTab(tab)}
                          className="text-xs px-2.5 py-0.5 rounded-md font-semibold transition-colors"
                          style={deployTab === tab
                            ? { background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }
                            : { background: 'transparent', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                          {t(`landing.aiRules.deployTabs.${tab}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="px-5 py-5 font-mono text-sm space-y-2 min-h-[276px]">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={deployTab}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.18 }}
                        className="space-y-2"
                      >
                        {DEPLOYMENT_LINES[deployTab].map((line, i) => (
                          <motion.div
                            key={`${deployTab}-${i}`}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="flex items-start gap-2"
                          >
                            {line.prompt && (
                              <span className="shrink-0 text-white/25">{line.prompt} $</span>
                            )}
                            <span className="break-all" style={{ color: line.color }}>{line.cmd}</span>
                          </motion.div>
                        ))}
                      </motion.div>
                    </AnimatePresence>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-white/25">~ $</span>
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ repeat: Infinity, duration: 0.8 }}
                        style={{ color: '#4ade80' }}
                      >|</motion.span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    { label: t('landing.aiRules.badges.mit'), color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
                    { label: t('landing.aiRules.badges.selfHost'), color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
                    { label: t('landing.aiRules.badges.noSubscriptions'), color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe' },
                  ].map(badge => (
                    <span
                      key={badge.label}
                      className="text-xs font-semibold px-3 py-1 rounded-full"
                      style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
                    >
                      {badge.label}
                    </span>
                  ))}
                </div>

                <motion.a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center justify-center gap-2.5 py-3 px-5 rounded-xl font-bold text-sm"
                  style={{
                    background: '#ffffff',
                    border: '1px solid #d1fae5',
                    color: '#059669',
                    boxShadow: '0 16px 40px -28px rgba(5,150,105,0.9)',
                  }}
                >
                  <GithubFilled />
                  GitHub
                  <span className="text-xs text-gray-400 font-normal">→ {t('landing.aiRules.githubFree')}</span>
                </motion.a>
              </div>
            </Reveal>

            <Reveal delay={0.12} className="lg:col-span-3">
              <div className="flex flex-col gap-4">
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: '#ffffff', border: '1px solid #e5e7eb', boxShadow: '0 18px 50px -38px rgba(15,23,42,0.45)' }}
                >
                  <KeyRound className="w-4 h-4 text-cyan-400 shrink-0" />
                  <p className="text-sm text-gray-500">
                    {t('landing.aiRules.keyInstructionPrefix')}{' '}
                    <span className="text-cyan-600 font-semibold">{t('landing.aiRules.keyInstructionTarget')}</span>.
                    {' '}{t('landing.aiRules.keyInstructionSuffix')}
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {AI_PROVIDER_ORDER.map((provider, i) => {
                    const meta = AI_PROVIDER_CONFIGS[provider];
                    const access = AI_PROVIDER_ACCESS[provider];
                    const Logo = AI_PROVIDER_LOGOS[provider];

                    return (
                      <Reveal key={provider} delay={i * 0.03}>
                        <motion.div
                          whileHover={{ y: -3, scale: 1.02 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                          className="relative flex h-full flex-col gap-2 p-4 rounded-xl cursor-default"
                          style={{ background: '#ffffff', border: `1px solid ${meta.color}26`, borderLeft: `3px solid ${meta.color}`, boxShadow: '0 16px 45px -36px rgba(15,23,42,0.55)' }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                style={{ background: `${meta.color}18` }}
                              >
                                <Logo className="w-4.5 h-4.5" style={{ color: meta.color }} />
                              </div>
                              <span className="text-sm font-bold truncate" style={{ color: meta.color }}>{meta.name}</span>
                            </div>
                            <span
                              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                              style={{ background: `${meta.color}18`, color: meta.color }}
                            >
                              {access.free}
                            </span>
                          </div>

                          <div className="font-mono text-xs rounded px-2 py-1"
                            style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e5e7eb' }}>
                            {access.keyHint}
                          </div>

                          <div className="flex items-center justify-between gap-3 mt-auto">
                            <span className="text-[10px] text-gray-400 truncate">{meta.defaultModel}</span>
                            <a
                              href={access.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="flex items-center gap-0.5 text-[10px] font-semibold transition-colors hover:opacity-80 shrink-0"
                              style={{ color: meta.color }}
                            >
                              {t('landing.aiRules.getKey')} <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        </motion.div>
                      </Reveal>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400 text-center">{t('landing.aiRules.privacy')}</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6 bg-gradient-to-b from-white to-slate-50 overflow-x-clip">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-20">
            <span className="inline-block text-xs font-bold text-emerald-600 tracking-[0.2em] uppercase mb-3 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">{t('landing.howItWorks.label')}</span>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mt-2 mb-4">{t('landing.howItWorks.title')}</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">{t('landing.howItWorks.subtitle')}</p>
          </Reveal>

          <div className="relative">
            {/* Animated connecting line */}
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
              style={{ originX: 0 }}
              className="hidden lg:block absolute top-11 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-emerald-300 via-green-300 to-teal-300"
            />
            <motion.div
              variants={stagger(0.18)}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-60px' }}
              className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10"
            >
              {STEPS.map((step) => (
                <motion.div key={step.n} variants={fadeUp} className="flex flex-col items-center text-center">
                  <motion.div
                    whileHover={{ y: -10, scale: 1.1, rotate: [-2, 2, -2, 0] }}
                    whileTap={{ scale: 0.92 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 16 }}
                    className="relative z-10 cursor-pointer mb-5"
                  >
                    <div className={`w-[88px] h-[88px] rounded-3xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-xl`}>
                      <step.icon className="w-9 h-9 text-white" strokeWidth={1.8} />
                    </div>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileHover={{ opacity: 0.55, scale: 1.28 }}
                      transition={{ duration: 0.25 }}
                      className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${step.color} blur-xl -z-10`}
                    />
                  </motion.div>

                  <h3 className="font-bold text-gray-900 mb-2 leading-snug">{step.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 bg-[#0f0c29] px-26 py-8">
        <div className="border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white">
          <p>{t('landing.footer.copy', { year: new Date().getFullYear() })}</p>
          <p>{t('landing.footer.tagline')}</p>
          <Link to="/app" className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
            {t('landing.footer.openApp')} <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </footer>
    </div>
  );
}
