import { SiteFooter } from '../_components/site-footer';
import { SiteHeader } from '../_components/site-header';
import { SITE } from '@/lib/site';

export const metadata = {
  title: 'قوانین استفاده — مکانیک هوشمند',
  description: 'قوانین استفاده از اپلیکیشن مکانیک هوشمند',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen text-white">
      <SiteHeader />
      <article className="mx-auto max-w-2xl px-4 py-16 leading-8 text-amber-100/85">
        <h1 className="text-3xl font-bold text-white">قوانین استفاده</h1>
        <p className="mt-2 text-sm text-amber-100/50">آخرین به‌روزرسانی: شهریور ۱۴۰۵</p>
        <p className="mt-6 font-semibold text-amber-100">
          این برنامه صرفاً تحلیل هوشمند ارائه می‌دهد و جایگزین مکانیک متخصص نیست.
        </p>
        <h2 className="mt-8 text-xl font-semibold text-amber-100">ماهیت خدمت</h2>
        <p className="mt-3">
          پاسخ‌ها بر اساس توضیح شما، دادهٔ صوتی و مدل هوش مصنوعی ساخته می‌شوند. تصمیم نهایی برای رانندگی، توقف یا
          تعمیر همیشه با شما و مکانیک متخصص است.
        </p>
        <h2 className="mt-8 text-xl font-semibold text-amber-100">موارد فوری</h2>
        <p className="mt-3">
          اگر دود غلیظ، بوی سوختگی، صدای برخورد فلز، از دست رفتن قدرت یا داغ‌کردن غیرعادی دیدید، رانندگی را متوقف کنید
          و به تعمیرگاه مراجعه کنید.
        </p>
        <p className="mt-8">
          پشتیبانی:{' '}
          <a className="text-orange-300 underline" href={`mailto:${SITE.supportEmail}`}>
            {SITE.supportEmail}
          </a>
        </p>
      </article>
      <SiteFooter />
    </div>
  );
}
