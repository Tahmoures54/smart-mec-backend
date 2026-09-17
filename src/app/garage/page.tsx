import type { Metadata } from 'next';
import { SiteShell } from '../_components/site-shell';
import { GarageApp } from './garage-app';

export const metadata: Metadata = {
  title: 'ثبت تعمیرگاه | مکانیک هوشمند',
  description:
    'تعمیرگاه خود را ثبت کنید و با پکیج معرفی، در نتایج عیب‌یابی کاربران نزدیک دیده شوید.',
  robots: { index: true, follow: true },
};

export default function GaragePage() {
  return (
    <SiteShell>
      <GarageApp />
    </SiteShell>
  );
}
