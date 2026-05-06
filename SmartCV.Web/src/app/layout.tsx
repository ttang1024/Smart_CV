import type { Metadata, Viewport } from 'next';
import '../index.css';
import Providers from './providers';
import { buildWechatMetadata, SHARE_IMAGE_PATH, SITE_URL } from './metadata';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
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
        url: SHARE_IMAGE_PATH,
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
    images: [SHARE_IMAGE_PATH],
  },
  other: buildWechatMetadata({
    title: 'SmartCV - Free AI Resume Builder',
    description:
      'Create ATS-friendly resumes with AI optimization, professional templates, local-first privacy, and export-ready formatting.',
    path: '/',
  }),
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
