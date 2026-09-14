import type { ReactNode } from 'react';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col text-white">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />

      {/* ─── Enamad Trust Seal (Floating - فقط در دسکتاپ) ─── */}
      <div className="hidden md:block fixed bottom-4 left-4 z-50">
        <a
          referrerPolicy="origin"
          target="_blank"
          href="https://trustseal.enamad.ir/?id=7731207&Code=Q14UpKWtFFDXzZarnOhA5dzChbURT0br"
        >
          <img
            referrerPolicy="origin"
            src="https://trustseal.enamad.ir/logo.aspx?id=7731207&Code=Q14UpKWtFFDXzZarnOhA5dzChbURT0br"
            alt=""
            style={{ cursor: 'pointer' }}
            data-code="Q14UpKWtFFDXzZarnOhA5dzChbURT0br"
          />
        </a>
      </div>
    </div>
  );
}
