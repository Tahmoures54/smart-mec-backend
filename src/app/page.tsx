import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4" dir="rtl">
      <h1 className="text-4xl font-bold text-orange-500 mb-6">مکانیک هوشمند (بک‌اند)</h1>
      <p className="text-lg text-gray-300 max-w-xl text-center mb-8">
        این سرور میزبان API های اپلیکیشن فلاتر مکانیک هوشمند می‌باشد. اپلیکیشن می‌تواند از طریق کلاینت موبایل به این بک‌اند متصل شود.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
        <div className="bg-gray-800 p-6 rounded-lg border border-orange-500/30">
          <h2 className="text-xl font-semibold mb-4 text-orange-400">نقاط پایانی اصلی</h2>
          <ul className="space-y-2 text-gray-300">
            <li><code className="text-orange-300 bg-gray-900 px-1 rounded">/api/account</code> - مدیریت ورود (OTP)</li>
            <li><code className="text-orange-300 bg-gray-900 px-1 rounded">/api/diagnose</code> - عیب‌یابی با هوش مصنوعی</li>
            <li><code className="text-orange-300 bg-gray-900 px-1 rounded">/api/purchase</code> - درگاه پرداخت</li>
            <li><code className="text-orange-300 bg-gray-900 px-1 rounded">/cars.json</code> - لیست خودروها</li>
          </ul>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg border border-orange-500/30">
          <h2 className="text-xl font-semibold mb-4 text-orange-400">وضعیت سرور</h2>
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-400">سرور فعال و در حال اجراست</span>
          </div>
          <div className="mt-4">
            <Link href="/api/health" className="text-orange-400 hover:text-orange-300 underline text-sm">
              بررسی سلامت سرور
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
