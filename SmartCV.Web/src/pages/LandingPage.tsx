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
} from 'lucide-react';
import { GithubFilled } from '@ant-design/icons';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';


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
  'from-indigo-500 to-violet-500',
  'from-violet-500 to-purple-500',
  'from-purple-500 to-fuchsia-500',
  'from-fuchsia-500 to-pink-500',
] as const;

const STEP_ICONS = [Upload, Wand2, LayoutTemplate, Download] as const;

const RESUME_STYLES = [
  { id: 'classic', name: 'Classic', accent: '#4338ca' },
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
  const [heroAccent, setHeroAccent] = useState('#6366f1');

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
        style={{ backgroundImage: 'radial-gradient(circle, #e0e7ff 1px, transparent 1px)', backgroundSize: '32px 32px', opacity: 0.4 }} />

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
            <span className="text-lg tracking-tight">Smart<span className="text-indigo-600">CV</span></span>
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
              <Link to="/app" className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-md shadow-indigo-200 transition-colors">
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
          className="absolute -top-48 -right-48 w-[700px] h-[700px] bg-indigo-100 rounded-full blur-3xl -z-10" />
        <motion.div animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.5, 0.35] }} transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute top-56 -left-48 w-[600px] h-[600px] bg-purple-100 rounded-full blur-3xl -z-10" />

        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">

          {/* ── Left: copy ── */}
          <div>
            {/* Open source pill */}
            <motion.div initial={{ opacity: 0, y: -10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 mb-8">
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white border border-gray-200 shadow-sm text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full hover:border-indigo-300 transition-all">
                <GithubFilled /> {t('landing.hero.openSource')} <ExternalLink className="w-3 h-3 text-gray-400" />
              </a>
              <span className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                <Sparkles className="w-3 h-3" /> {t('landing.hero.freeBadge')}
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1 variants={stagger(0.09)} initial="hidden" animate="show"
              className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.08] mb-6">
              <motion.span variants={fadeUp} className="block text-gray-900">{t('landing.hero.headline1')}</motion.span>
              <motion.span variants={fadeUp} className="block bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500 bg-clip-text text-transparent pb-1">
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
                <Link to="/app" className="inline-flex items-center gap-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-4 rounded-xl shadow-xl shadow-indigo-300/40 transition-colors text-base">
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
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-50 shrink-0">
                      <Icon className="w-3 h-3 text-indigo-500" />
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
              <div className="relative rounded-2xl overflow-hidden border border-gray-200/80 shadow-[0_32px_80px_-12px_rgba(99,102,241,0.25)] bg-white">
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


      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6 bg-gradient-to-b from-white to-slate-50 overflow-x-clip">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-20">
            <span className="inline-block text-xs font-bold text-indigo-600 tracking-[0.2em] uppercase mb-3 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">{t('landing.howItWorks.label')}</span>
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
              className="hidden lg:block absolute top-11 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300"
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
          <Link to="/app" className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
            {t('landing.footer.openApp')} <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </footer>
    </div>
  );
}
