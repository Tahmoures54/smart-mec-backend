import Link from 'next/link';
import { SITE } from '@/lib/site';
import { ENAMAD_LOGO_SRC, ENAMAD_PROFILE_HREF, ENAMAD_SEAL_CODE } from '@/lib/enamad';

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-black/30">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-bold text-white">{SITE.nameFa}</p>
          <p className="mt-1 text-sm text-amber-100/70">{SITE.tagline}</p>
          <p className="mt-0.5 text-xs text-amber-100/50">{SITE.subtitle}</p>
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
          <Link href="/admin" className="hover:text-white">
            ورود مدیران
          </Link>
        </div>
      </div>

      {/* Enamad Trust Seal — پس‌زمینه سفید تا روی تم تیره دیده شود */}
      <div className="mx-auto flex max-w-6xl justify-center px-4 pb-6">
        <a
          referrerPolicy="origin"
          target="_blank"
          rel="noopener noreferrer"
          href={ENAMAD_PROFILE_HREF}
          aria-label="نماد اعتماد الکترونیکی"
          className="inline-flex h-[125px] w-[125px] items-center justify-center rounded-xl bg-white p-2 shadow-lg transition-transform hover:scale-105"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            referrerPolicy="origin"
            src={ENAMAD_LOGO_SRC}
            alt="نماد اعتماد الکترونیکی"
            width={125}
            height={125}
            className="h-[110px] w-[110px] cursor-pointer object-contain"
            data-code={ENAMAD_SEAL_CODE}
          />
        </a>
      </div>

      <p className="px-4 pb-8 text-center text-xs text-amber-100/40">
        تحلیل هوش مصنوعی جای بازدید حضوری مکانیک متخصص را نمی‌گیرد.
      </p>
    </footer>
  );
}
