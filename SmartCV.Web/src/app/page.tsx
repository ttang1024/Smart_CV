import type { Metadata } from 'next';
import LandingPage from './landing';
import { buildLandingMetadata } from './metadata';

export const metadata: Metadata = buildLandingMetadata('en');

export default function Page() {
  return <LandingPage initialLanguage="en" />;
}
