'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Health = {
  status: string;
  timestamp?: string;
  checks?: { database?: { ok?: boolean; latencyMs?: number; error?: string } };
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

export default function Home() {
  const [health, setHealth] = useState<Health | null>(null);
  const [products, setProducts] = useState<number | null>(null);
  const [cars, setCars] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ status: 'degraded' }));
    fetch('/api/products')
      .then((r) => r.json())
      .then((d) => setProducts(d.meta?.count ?? d.data?.length ?? 0))
      .catch(() => setProducts(0));
    fetch('/api/cars')
      .then((r) => r.json())
      .then((d) => setCars(d.meta?.count ?? d.data?.length ?? 0))
      .catch(() => setCars(0));
  }, []);

  const dbOk = health?.checks?.database?.ok;
  const online = health?.status === 'ok';

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 py-12" dir="rtl">
      <h1 className="text-4xl font-bold text-orange-500 mb-3">مکانیک هوشمند</h1>
      <p className="text-lg text-gray-300 max-w-xl text-center mb-8">
        بک‌اند API اپلیکیشن فلاتر. عیب‌یابی با هوش مصنوعی، تعمیرگاه‌های نزدیک، پرداخت و رفرال.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl mb-6">
        <div className="bg-gray-800 p-6 rounded-lg border border-orange-500/30">
          <h2 className="text-xl font-semibold mb-4 text-orange-400">وضعیت سرور</h2>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${online ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className={online ? 'text-green-400' : 'text-amber-400'}>
              {health ? (online ? 'آماده سرویس‌دهی' : 'حالت محدود (دیتابیس در دسترس نیست)') : 'در حال بررسی…'}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-3">
            دیتابیس: {dbOk ? `سالم (${health?.checks?.database?.latencyMs}ms)` : health ? 'قطع / پیکربندی نشده' : '…'}
          </p>
          <div className="mt-4 flex gap-4 text-sm">
            <Link href="/api/health" className="text-orange-400 hover:text-orange-300 underline">
              /api/health
            </Link>
            <Link href="/admin" className="text-orange-400 hover:text-orange-300 underline">
              پنل ادمین
            </Link>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-orange-500/30">
          <h2 className="text-xl font-semibold mb-4 text-orange-400">کاتالوگ</h2>
          <ul className="space-y-2 text-gray-300">
            <li>محصولات فروش: {products ?? '…'} بسته</li>
            <li>خودروهای پشتیبانی‌شده: {cars ?? '…'} مدل</li>
            <li>نسخه API: <code className="text-orange-300">/api</code> و <code className="text-orange-300">/api/v1</code></li>
          </ul>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg border border-orange-500/30 w-full max-w-3xl">
        <h2 className="text-xl font-semibold mb-4 text-orange-400">نقاط پایانی</h2>
        <ul className="space-y-2 text-gray-300">
          {ENDPOINTS.map((item) => (
            <li key={item.path} className="flex flex-col sm:flex-row sm:gap-3">
              <code className="text-orange-300 bg-gray-900 px-1 rounded shrink-0">{item.path}</code>
              <span>{item.desc}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
