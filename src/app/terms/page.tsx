import { SiteShell } from '../_components/site-shell';
import { SITE } from '@/lib/site';

export const metadata = {
  title: 'قوانین استفاده — مکانیک هوشمند',
  description: 'قوانین استفاده از اپلیکیشن مکانیک هوشمند',
};

export default function TermsPage() {
  return (
    <SiteShell>
      <article className="mx-auto max-w-2xl px-4 py-16 leading-8 text-amber-100/85">
        <h1 className="text-3xl font-bold text-white">قوانین استفاده</h1>
        <p className="mt-2 text-sm text-amber-100/50">آخرین به‌روزرسانی: شهریور ۱۴۰۵</p>

        <h2 className="mt-8 text-xl font-semibold text-amber-100">ماهیت خدمت و سلب مسئولیت</h2>
        <p className="mt-3 font-semibold text-amber-100">
          این برنامه صرفاً تحلیل هوشمند ارائه می‌دهد و جایگزین مکانیک متخصص نیست.
        </p>
        <p className="mt-3">
          پاسخ‌ها بر اساس توضیح شما، دادهٔ صوتی و مدل هوش مصنوعی ساخته می‌شوند. تصمیم نهایی برای رانندگی، توقف یا
          تعمیر همیشه با شما و مکانیک متخصص است. مکانیک هوشمند مسئول خسارت ناشی از اتکا صرف به تحلیل نرم‌افزاری بدون
          بازدید حضوری نیست.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-amber-100">موارد فوری</h2>
        <p className="mt-3">
          اگر دود غلیظ، بوی سوختگی، صدای برخورد فلز، از دست رفتن قدرت یا داغ‌کردن غیرعادی دیدید، رانندگی را متوقف کنید
          و به تعمیرگاه مراجعه کنید.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-amber-100">پرداخت و اعتبار</h2>
        <p className="mt-3">
          خرید بسته و اشتراک از درگاه بانکی انجام می‌شود. پس از تأیید پرداخت، اعتبار روی همان حساب اعمال می‌گردد. در
          صورت کسر مبلغ بدون اعمال اعتبار، با پشتیبانی تماس بگیرید.
        </p>

        <p className="mt-8">
          پشتیبانی:{' '}
          <a className="text-orange-300 underline" href={`mailto:${SITE.supportEmail}`}>
            {SITE.supportEmail}
          </a>
        </p>
      </article>
    </SiteShell>
  );
}
