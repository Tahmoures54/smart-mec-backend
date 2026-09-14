import type { ReactNode } from 'react';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col text-white">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />

      {/* ─── Enamad Trust Seal (Floating) ─── */}
      <a
        referrerPolicy="origin"
        target="_blank"
        rel="noopener noreferrer"
        href="https://trustseal.enamad.ir/?id=7731207&Code=Q14UpKWtFFDXzZarnOhA5dzChbURT0br"
        className="fixed bottom-4 left-4 z-50 rounded-lg bg-white p-2 shadow-lg transition-transform hover:scale-105"
        aria-label="نماد اعتماد الکترونیکی"
      >
        <img
          referrerPolicy="origin"
          src="https://trustseal.enamad.ir/logo.aspx?id=7731207&Code=Q14UpKWtFFDXzZarnOhA5dzChbURT0br"
          alt="نماد اعتماد الکترونیکی"
          className="h-20 w-auto cursor-pointer"
          data-code="Q14UpKWtFFDXzZarnOhA5dzChbURT0br"
        />
      </a>
    </div>
  );
}
