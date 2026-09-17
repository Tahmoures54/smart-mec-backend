import type { ReactNode } from 'react';
import { ENAMAD_LOGO_SRC, ENAMAD_PROFILE_HREF, ENAMAD_SEAL_CODE } from '@/lib/enamad';
import { getDownloadLinks } from '@/lib/site';
import { AppDownloadPrompt } from './app-download-prompt';
import { HomePromoCarousel } from './home-promo-carousel';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';

export function SiteShell({ children }: { children: ReactNode }) {
  const appDownload = getDownloadLinks().find((link) => link.href)?.href || null;

  return (
    <div className="flex min-h-screen flex-col text-white">
      <SiteHeader />
      <HomePromoCarousel appHref={appDownload} />
      <div className="flex-1">{children}</div>
      <SiteFooter />

      <AppDownloadPrompt href={appDownload} />

      {/* Enamad floating seal — desktop only; footer shows on all sizes */}
      <div className="fixed bottom-4 left-4 z-50 hidden md:block">
        <a
          referrerPolicy="origin"
          target="_blank"
          rel="noopener noreferrer"
          href={ENAMAD_PROFILE_HREF}
          aria-label="نماد اعتماد الکترونیکی"
          className="inline-flex h-[100px] w-[100px] items-center justify-center rounded-xl bg-white p-1.5 shadow-xl"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            referrerPolicy="origin"
            src={ENAMAD_LOGO_SRC}
            alt="نماد اعتماد الکترونیکی"
            width={100}
            height={100}
            className="h-[90px] w-[90px] cursor-pointer object-contain"
            data-code={ENAMAD_SEAL_CODE}
          />
        </a>
      </div>
    </div>
  );
}
