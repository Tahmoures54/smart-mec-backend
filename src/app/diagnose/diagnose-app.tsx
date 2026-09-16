'use client';

import { useEffect, useState } from 'react';

export function DiagnoseApp() {
  const [msg, setMsg] = useState('در حال بارگذاری…');
  useEffect(() => {
    setMsg('صفحه عیب‌یابی موقتاً در حال به‌روزرسانی است. لطفاً یک دقیقه دیگر رفرش کنید.');
  }, []);
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center" dir="rtl">
      <h1 className="text-2xl font-bold text-amber-100">عیب‌یابی هوشمند</h1>
      <p className="mt-4 text-amber-100/70">{msg}</p>
      <a href="/" className="mt-6 inline-block text-orange-300">بازگشت به صفحه اصلی</a>
    </div>
  );
}
