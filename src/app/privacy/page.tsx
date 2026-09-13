import { SiteShell } from '../_components/site-shell';
import { SITE } from '@/lib/site';

export const metadata = {
  title: 'حریم خصوصی — مکانیک هوشمند',
  description: 'سیاست حریم خصوصی اپلیکیشن مکانیک هوشمند',
};

export default function PrivacyPage() {
  return (
    <SiteShell>
      <article className="mx-auto max-w-2xl px-4 py-16 leading-8 text-amber-100/85">
        <h1 className="text-3xl font-bold text-white">سیاست حریم خصوصی</h1>
        <p className="mt-2 text-sm text-amber-100/50">آخرین به‌روزرسانی: مرداد ۱۴۰۴</p>
        <h2 className="mt-8 text-xl font-semibold text-amber-100">اطلاعات جمع‌آوری‌شده</h2>
        <ul className="mt-3 list-disc pr-5">
          <li>شماره موبایل (برای ورود با OTP)</li>
          <li>داده‌های عیب‌یابی و تاریخچه</li>
          <li>موقعیت مکانی تقریبی فقط هنگام جستجوی تعمیرگاه نزدیک</li>
          <li>فایل صوتی موتور برای تحلیل</li>
        </ul>
        <h2 className="mt-8 text-xl font-semibold text-amber-100">نحوه استفاده</h2>
        <p className="mt-3">
          اطلاعات فقط برای عیب‌یابی، نمایش تعمیرگاه نزدیک و مدیریت حساب استفاده می‌شود.
        </p>
        <h2 className="mt-8 text-xl font-semibold text-amber-100">حقوق شما</h2>
        <p className="mt-3">
          برای حذف حساب و داده‌های مرتبط به{' '}
          <a className="text-orange-300 underline" href={`mailto:${SITE.supportEmail}`}>
            {SITE.supportEmail}
          </a>{' '}
          پیام بدهید.
        </p>
      </article>
    </SiteShell>
  );
}
