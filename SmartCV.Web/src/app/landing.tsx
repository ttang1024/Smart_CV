import Link from 'next/link';
import { Sparkles, ArrowRight, ExternalLink, KeyRound, SlidersHorizontal } from 'lucide-react';
import { GithubFilled } from '@ant-design/icons';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';
import ResumeHeroPreview from '../components/landing/ResumeHeroPreview';
import DeploymentTerminal from '../components/landing/DeploymentTerminal';
import { getDemoResume } from '../data/demoResume';
import { AI_PROVIDER_CONFIGS } from '../types/ai';
import { SITE_URL } from './metadata';
import { createTranslator, type LandingLanguage } from '../components/landing/i18n';
import {
  GITHUB_URL, AI_PROVIDER_ORDER, AI_PROVIDER_ACCESS, AI_PROVIDER_LOGOS,
  buildSteps, buildHeroFeatures, buildFunctions,
} from '../components/landing/content';
import { FunctionPreview } from '../components/landing/FunctionPreview';

export type { LandingLanguage };

export default function LandingPage({ initialLanguage = 'en' }: { initialLanguage?: LandingLanguage }) {
  const t = createTranslator(initialLanguage);
  const demoResume = getDemoResume(initialLanguage);
  const aiRulesTitle = t('landing.aiRules.title');
  const [aiRulesTitleLead, ...aiRulesTitleRest] = aiRulesTitle.split(',');
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'SmartCV',
    alternateName: 'SmartCV AI Resume Builder',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: SITE_URL,
    description: t('landing.hero.subheadline'),
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [
      t('landing.hero.features.styles'),
      t('landing.hero.features.aiProviders'),
      t('landing.hero.features.private'),
      t('landing.hero.features.noSignup'),
      t('landing.hero.features.downloads'),
      t('landing.hero.features.ats'),
    ],
  };

  const steps = buildSteps(t);
  const heroFeatures = buildHeroFeatures(t);
  const functions = buildFunctions(t);

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-clip">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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

      <section className="relative py-24 px-6 overflow-x-clip text-gray-900">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24" style={{ background: 'linear-gradient(to bottom, transparent, rgba(16,185,129,0.35), transparent)' }} />

        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.18em] uppercase mb-3 px-3 py-1 rounded-full" style={{ background: '#ecfdf5', border: '1px solid #d1fae5', color: '#059669' }}>
              <Sparkles className="w-3.5 h-3.5" />
              {t('landing.functions.label')}
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold leading-tight mt-2 mb-4">
              <span style={{ background: 'linear-gradient(135deg, #047857, #0891b2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {t('landing.functions.title')}
              </span>
            </h2>
            <p className="text-gray-500 text-lg leading-relaxed max-w-2xl mx-auto">{t('landing.functions.subtitle')}</p>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {functions.map(({ type, icon: Icon, title, desc, iconGrad, border, shadow, tint }) => (
              <div
                key={title}
                className={`group relative flex flex-col overflow-hidden rounded-2xl cursor-default transition-all duration-300 hover:-translate-y-2 bg-gradient-to-br ${tint}`}
                style={{ border: `1.5px solid ${border}`, boxShadow: shadow }}
              >
                <div className="p-6 pb-4">
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className="relative shrink-0">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${iconGrad} flex items-center justify-center shadow-md`}>
                        <Icon className="w-5 h-5 text-white" strokeWidth={1.8} />
                      </div>
                      <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${iconGrad} blur-lg -z-10 opacity-30`} />
                    </div>
                    <h3 className="text-base font-extrabold text-gray-900 leading-snug">{title}</h3>
                  </div>
                  <p className="text-[13px] text-gray-500 leading-relaxed">{desc}</p>
                </div>

                <div className="px-5 pb-5 flex-1 flex flex-col">
                  <div className="relative flex-1 overflow-hidden rounded-xl border border-gray-100 bg-white/80 p-3.5 shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:border-gray-200 group-hover:bg-white" style={{ minHeight: '168px' }}>
                    <FunctionPreview type={type} t={t} />
                  </div>
                </div>
              </div>
            ))}
          </div>
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
                <DeploymentTerminal
                  labels={{
                    local: t('landing.aiRules.deployTabs.local'),
                    docker: t('landing.aiRules.deployTabs.docker'),
                    aws: t('landing.aiRules.deployTabs.aws'),
                  }}
                />

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

      <footer className="border-t border-gray-200 bg-white px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>{t('landing.footer.copy', { year: new Date().getFullYear() })}</p>
          <p className="text-gray-400">{t('landing.footer.tagline')}</p>
          <Link href="/app" className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm shadow-emerald-200 transition-colors">
            {t('landing.footer.openApp')} <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </footer>
    </div>
  );
}
