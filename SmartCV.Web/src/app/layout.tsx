import type { Metadata, Viewport } from 'next';
import '../index.css';
import Providers from './providers';

export const metadata: Metadata = {
  metadataBase: new URL('https://smart-cv.app'),
  title: {
    default: 'SmartCV - Free AI Resume Builder',
    template: '%s | SmartCV',
  },
  description:
    'Build polished, ATS-friendly resumes with SmartCV, an open-source AI resume builder with local storage, multiple templates, and export tools.',
  applicationName: 'SmartCV',
  keywords: [
    'AI resume builder',
    'free resume builder',
    'ATS resume',
    'CV maker',
    'open source resume builder',
    'SmartCV',
  ],
  authors: [{ name: 'SmartCV' }],
  creator: 'SmartCV',
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'SmartCV',
    title: 'SmartCV - Free AI Resume Builder',
    description:
      'Create ATS-friendly resumes with AI optimization, professional templates, local-first privacy, and export-ready formatting.',
    images: [
      {
        url: '/favicon.svg',
        width: 512,
        height: 512,
        alt: 'SmartCV',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'SmartCV - Free AI Resume Builder',
    description:
      'Create ATS-friendly resumes with AI optimization, professional templates, local-first privacy, and export-ready formatting.',
    images: ['/favicon.svg'],
  },
  icons: {
    icon: '/favicon.svg',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#059669',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
