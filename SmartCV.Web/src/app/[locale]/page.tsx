import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import LandingPage from '../landing';
import { buildLandingMetadata, ROUTE_LOCALES, type RouteLocale } from '../metadata';

export function generateStaticParams() {
  return Object.keys(ROUTE_LOCALES).map(locale => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  if (!Object.hasOwn(ROUTE_LOCALES, locale)) {
    return {};
  }

  return buildLandingMetadata(ROUTE_LOCALES[locale as RouteLocale]);
}

export default async function LocalePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  if (!Object.hasOwn(ROUTE_LOCALES, locale)) {
    notFound();
  }

  return <LandingPage initialLanguage={ROUTE_LOCALES[locale as RouteLocale]} />;
}
