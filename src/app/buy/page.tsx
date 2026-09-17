import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SiteShell } from '../_components/site-shell';
import { BuyApp } from './buy-app';

export const metadata: Metadata = {
  title: 'شارژ اعتبار و اشتراک طلایی | مکانیک هوشمند',
  description:
    'با یک بسته کوچک، جلوی هزینهٔ چند میلیونی تشخیص اشتباه را بگیر. شارژ اعتبار یا اشتراک طلایی — فعال‌سازی آنی.',
  robots: { index: true, follow: true },
};

export default function BuyPage() {
  return (
    <SiteShell>
      <Suspense
        fallback={
          <div className="mx-auto max-w-6xl px-4 py-16 text-center text-amber-100/60">
            در حال بارگذاری بسته‌ها…
          </div>
        }
      >
        <BuyApp />
      </Suspense>
    </SiteShell>
  );
}
