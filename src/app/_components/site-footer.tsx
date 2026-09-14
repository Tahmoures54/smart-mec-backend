import Link from 'next/link';
import { SITE } from '@/lib/site';
import { EnamadSeal } from './enamad-seal';

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-black/30">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-bold text-white">{SITE.nameFa}</p>
          <p className="mt-1 text-sm text-amber-100/70">{SITE.tagline}</p>
          <a
            href={`mailto:${SITE.supportEmail}`}
            className="mt-3 inline-block text-sm text-orange-300 hover:text-orange-200"
            dir="ltr"
          >
            {SITE.supportEmail}
          </a>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-amber-100/75">
          <Link href="/diagnose" className="hover:text-white">
            عیب‌یابی آنلاین
          </Link>
          <Link href="/#download" className="hover:text-white">
            دانلود اپ
          </Link>
          <Link href="/privacy" className="hover:text-white">
            حریم خصوصی
          </Link>
          <Link href="/terms" className="hover:text-white">
            قوانین استفاده
          </Link>
          <Link href="/dev" className="hover:text-white">
            وضعیت سرویس
          </Link>
        </div>
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm font-semibold text-amber-100">نماد اعتماد الکترونیکی</p>
          <EnamadSeal />
          <p className="max-w-[14rem] text-xs leading-6 text-amber-100/55">
            پرداخت امن از درگاه بانکی — اعتبار بلافاصله بعد از خرید اعمال می‌شود.
          </p>
        </div>
      </div>
      <p className="px-4 pb-8 text-center text-xs text-amber-100/40">
        © {SITE.nameFa} — {SITE.nameEn}
      </p>
    </footer>
  );
}
