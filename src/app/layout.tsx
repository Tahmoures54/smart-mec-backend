import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Vazirmatn } from 'next/font/google';
import { SITE } from '@/lib/site';
import './globals.css';

const vazirmatn = Vazirmatn({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const siteUrl = process.env.APP_URL || 'https://smart-mec-backend-zeta.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${SITE.nameFa} | ${SITE.tagline}`,
    template: `%s | ${SITE.nameFa}`,
  },
  description: SITE.description,
  applicationName: SITE.nameFa,
  icons: {
    icon: '/branding/logo.svg',
    apple: '/branding/app_icon.png',
  },
  openGraph: {
    title: `${SITE.nameFa} | ${SITE.tagline}`,
    description: SITE.description,
    url: siteUrl,
    siteName: SITE.nameFa,
    locale: 'fa_IR',
    type: 'website',
    images: [{ url: '/branding/banner.png', width: 1600, height: 640, alt: SITE.nameFa }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.nameFa} | ${SITE.tagline}`,
    description: SITE.description,
    images: ['/branding/banner.png'],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <meta name="enamad" content="24876525" />
      </head>
      <body className={`${vazirmatn.className} bg-[#140C08] text-slate-100 antialiased`}>{children}</body>
    </html>
  );
}
