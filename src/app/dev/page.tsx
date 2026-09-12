import Link from 'next/link';
import { PRODUCTS } from '@/types';
import carsData from '@/data/cars.json';
import { HealthPanel } from '../health-panel';
import { SiteShell } from '../_components/site-shell';

export const metadata = {
  title: 'وضعیت سرویس',
  robots: { index: false, follow: false },
};

const ENDPOINTS = [
  { path: '/api/account', desc: 'ورود با OTP و کد دعوت' },
  { path: '/api/account/credits', desc: 'پروفایل، اعتبار و سهمیه رایگان' },
  { path: '/api/diagnose', desc: 'عیب‌یابی متنی AI (سال ساخت + شرح)' },
  { path: '/api/diagnose/audio', desc: 'عیب‌یابی از صدای موتور' },
  { path: '/api/purchase', desc: 'ایجاد تراکنش PayPing' },
  { path: '/api/purchase/verify', desc: 'تأیید پرداخت (کال‌بک درگاه)' },
  { path: '/api/products', desc: 'لیست بسته‌های اعتبار و اشتراک طلایی' },
  { path: '/api/cars', desc: 'لیست خودروها با جستجو' },
  { path: '/api/garages/nearby', desc: 'تعمیرگاه‌های نزدیک روی نقشه' },
  { path: '/api/feedback', desc: 'امتیاز به نتیجه عیب‌یابی' },
  { path: '/cars.json', desc: 'فایل استاتیک خودروها برای اپ فلاتر' },
  { path: '/admin', desc: 'پنل مدیریت' },
];

export default function DevStatusPage() {
  const productCount = Object.keys(PRODUCTS).length;
  const carCount = Array.isArray(carsData) ? carsData.length : 0;

  return (
    <SiteShell>
      <main className="mx-auto flex max-w-3xl flex-col items-center px-4 py-12">
        <p className="mb-2 text-sm text-amber-200/70">صفحه فنی سرویس</p>
        <h1 className="mb-3 text-4xl font-bold text-orange-500">وضعیت و API</h1>
        <p className="mb-8 max-w-xl text-center text-lg text-gray-300">
          این صفحه برای پایش سرور است. اگر می‌خواهید اپ را نصب کنید به{' '}
          <Link href="/" className="text-orange-300 underline hover:text-orange-200">
            صفحه اصلی
          </Link>{' '}
          بروید.
        </p>

        <div className="mb-6 grid w-full grid-cols-1 gap-4 md:grid-cols-2">
          <HealthPanel />

          <div className="rounded-lg border border-orange-500/30 bg-gray-800 p-6">
            <h2 className="mb-4 text-xl font-semibold text-orange-400">کاتالوگ</h2>
            <ul className="space-y-2 text-gray-300">
              <li>محصولات فروش: {productCount} بسته</li>
              <li>خودروهای پشتیبانی‌شده: {carCount} مدل</li>
              <li>
                نسخه API:{' '}
                <code dir="ltr" className="rounded bg-gray-900 px-1 text-orange-300">
                  /api
                </code>{' '}
                و{' '}
                <code dir="ltr" className="rounded bg-gray-900 px-1 text-orange-300">
                  /api/v1
                </code>
              </li>
            </ul>
          </div>
        </div>

        <div className="w-full rounded-lg border border-orange-500/30 bg-gray-800 p-6">
          <h2 className="mb-4 text-xl font-semibold text-orange-400">نقاط پایانی</h2>
          <ul className="space-y-2 text-gray-300">
            {ENDPOINTS.map((item) => (
              <li key={item.path} className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                <Link
                  href={item.path}
                  dir="ltr"
                  className="shrink-0 rounded bg-gray-900 px-1 font-mono text-sm text-orange-300 hover:text-orange-200"
                >
                  {item.path}
                </Link>
                <span>{item.desc}</span>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </SiteShell>
  );
}
