'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SITE } from '@/lib/site';
import { ENAMAD_PROFILE_HREF, ENAMAD_SEAL_CODE } from '@/lib/enamad';

/** لوگو از پروکسی هم‌دامنه تا هات‌لینک اینماد سفید نماند */
const ENAMAD_IMG_SRC = '/api/enamad-logo';

export function SiteFooter() {
  const [logoFailed, setLogoFailed] = useState(false);

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
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 pb-6">
        <a
          referrerPolicy="origin"
          target="_blank"
          rel="noopener noreferrer"
          href={ENAMAD_PROFILE_HREF}
          aria-label="نماد اعتماد الکترونیکی"
          className="inline-flex h-[130px] w-[130px] items-center justify-center rounded-2xl border-2 border-orange-400/40 bg-white p-2 shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-transform hover:scale-105"
        >
          {!logoFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              referrerPolicy="origin"
              src={ENAMAD_IMG_SRC}
              alt="نماد اعتماد الکترونیکی"
              width={110}
              height={110}
              className="h-[110px] w-[110px] cursor-pointer object-contain"
              data-code={ENAMAD_SEAL_CODE}
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <span className="px-2 text-center text-xs font-bold leading-5 text-[#1a237e]">
              نماد اعتماد
              <br />
              الکترونیکی
              <br />
              <span className="text-[10px] font-normal text-slate-600">مشاهده در enamad.ir</span>
            </span>
          )}
        </a>
        <p className="text-[11px] text-amber-100/45">نماد اعتماد الکترونیکی</p>
      </div>

      <p className="px-4 pb-8 text-center text-xs text-amber-100/40">
        تحلیل هوش مصنوعی جای بازدید حضوری مکانیک متخصص را نمی‌گیرد.
      </p>
    </footer>
  );
}
