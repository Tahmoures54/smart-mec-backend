import Link from 'next/link';
import { PRODUCTS } from '@/types';
import carsData from '@/data/cars.json';
import { HealthPanel } from './health-panel';

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

export default function Home() {
  const productCount = Object.keys(PRODUCTS).length;
  const carCount = Array.isArray(carsData) ? carsData.length : 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 py-12" dir="rtl">
      <h1 className="text-4xl font-bold text-orange-500 mb-3">مکانیک هوشمند</h1>
      <p className="text-lg text-gray-300 max-w-xl text-center mb-8">
        بک‌اند API اپلیکیشن فلاتر. عیب‌یابی با هوش مصنوعی، تعمیرگاه‌های نزدیک، پرداخت و رفرال.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl mb-6">
        <HealthPanel />

        <div className="bg-gray-800 p-6 rounded-lg border border-orange-500/30">
          <h2 className="text-xl font-semibold mb-4 text-orange-400">کاتالوگ</h2>
          <ul className="space-y-2 text-gray-300">
            <li>محصولات فروش: {productCount} بسته</li>
            <li>خودروهای پشتیبانی‌شده: {carCount} مدل</li>
            <li>
              نسخه API:{' '}
              <code dir="ltr" className="text-orange-300 bg-gray-900 px-1 rounded">
                /api
              </code>{' '}
              و{' '}
              <code dir="ltr" className="text-orange-300 bg-gray-900 px-1 rounded">
                /api/v1
              </code>
            </li>
          </ul>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg border border-orange-500/30 w-full max-w-3xl">
        <h2 className="text-xl font-semibold mb-4 text-orange-400">نقاط پایانی</h2>
        <ul className="space-y-2 text-gray-300">
          {ENDPOINTS.map((item) => (
            <li key={item.path} className="flex flex-col sm:flex-row sm:gap-3 sm:items-center">
              <Link
                href={item.path}
                dir="ltr"
                className="text-orange-300 bg-gray-900 px-1 rounded shrink-0 font-mono text-sm hover:text-orange-200"
              >
                {item.path}
              </Link>
              <span>{item.desc}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
