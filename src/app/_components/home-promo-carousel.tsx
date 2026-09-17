'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Slide = {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  href: string;
  icon: string;
};

const BASE_SLIDES: Slide[] = [
  {
    eyebrow: 'خودروهای سبک و سواری',
    title: 'برای خودروهای روزمره، دقیق‌تر تصمیم بگیر',
    body: 'از خودروهای شهری و سواری تا مدل‌های پرتیراژ؛ مشکل را شرح بده و مسیر بررسی را روشن‌تر کن.',
    cta: 'شروع عیب‌یابی',
    href: '/diagnose',
    icon: '🚗',
  },
  {
    eyebrow: 'شاسی‌بلند و آفرود',
    title: 'برای مسیرهای سخت، آماده‌تر باش',
    body: 'علائم موتور، انتقال قدرت و مشکلات رایج خودروهای شاسی‌بلند و آفرود را بهتر بررسی کن.',
    cta: 'بررسی خودرو',
    href: '/diagnose',
    icon: '🏔️',
  },
  {
    eyebrow: 'کامیون و اتوبوس',
    title: 'وقتی وسیله سنگین است، تشخیص مهم‌تر می‌شود',
    body: 'برای ناوگان، کامیون و اتوبوس، شرح دقیق علائم می‌تواند شروع بهتری برای بررسی فنی باشد.',
    cta: 'شروع بررسی',
    href: '/diagnose',
    icon: '🚌',
  },
  {
    eyebrow: 'جرثقیل و ماشین‌آلات سنگین',
    title: 'ماشین‌آلات سنگین را هوشمندتر بررسی کن',
    body: 'برای تجهیزات عمرانی و کارگاهی، علائم فنی را ثبت کن و قبل از توقف طولانی مسیر بررسی را مشخص‌تر کن.',
    cta: 'راهنمایی فنی',
    href: '/diagnose',
    icon: '🏗️',
  },
  {
    eyebrow: 'ژنراتور و تجهیزات تولید برق',
    title: 'تجهیزات تولید برق هم نیاز به تشخیص دارند',
    body: 'علائم موتور، لرزش، صدا یا افت عملکرد ژنراتور را ثبت کن و بررسی اولیه را منظم‌تر شروع کن.',
    cta: 'شروع بررسی',
    href: '/diagnose',
    icon: '⚡',
  },
  {
    eyebrow: 'تحلیل صدای موتور',
    title: 'صدای غیرعادی را جدی بگیر',
    body: 'صدای موتور را ضبط کن تا برای پیدا کردن علت‌های محتمل، راهنمایی اولیه بگیری.',
    cta: 'تحلیل صدا',
    href: '/diagnose',
    icon: '🎙️',
  },
  {
    eyebrow: 'آمادگی برای تعمیرگاه',
    title: 'با اطلاعات بیشتر وارد تعمیرگاه شو',
    body: 'قبل از تعویض قطعه، سؤال‌های درست را بشناس و تصمیم آگاهانه‌تری بگیر.',
    cta: 'راهنمایی بگیر',
    href: '/diagnose',
    icon: '🛡️',
  },
];

export function HomePromoCarousel({ appHref }: { appHref: string | null }) {
  const slides = appHref
    ? [
        {
          eyebrow: 'اپلیکیشن مکانیک هوشمند',
          title: 'مکانیک هوشمند را همیشه همراهت داشته باش',
          body: 'عیب‌یابی و راهنمایی خودرو را روی موبایل در دسترس داشته باش؛ سریع و ساده.',
          cta: 'دانلود اپ',
          href: appHref,
          icon: '📱',
        },
        ...BASE_SLIDES,
      ]
    : BASE_SLIDES;

  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  const slide = slides[active] ?? slides[0];
  if (!slide) return null;

  return (
    <section
      className="mx-auto max-w-6xl px-4 py-5 sm:py-7"
      aria-label="معرفی قابلیت‌ها و دسته‌های تحت پوشش مکانیک هوشمند"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="relative overflow-hidden rounded-[2rem] border border-orange-300/15 bg-gradient-to-l from-[#21130c] via-[#18100d] to-[#101114] shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-orange-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/3 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />

        <div className="relative grid min-h-[190px] items-center gap-6 px-5 py-6 sm:px-8 md:grid-cols-[1fr_auto] md:px-10 md:py-8">
          <div className="flex items-start gap-4">
            <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-orange-300/15 bg-orange-400/10 text-2xl sm:flex">
              {slide.icon}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold tracking-wide text-orange-300">{slide.eyebrow}</p>
              <h2 className="mt-1 text-xl font-extrabold leading-8 text-white sm:text-2xl">{slide.title}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-amber-50/65 sm:text-[15px]">{slide.body}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 md:justify-end">
            <Link
              href={slide.href}
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-orange-500 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-orange-950/25 transition hover:-translate-y-0.5 hover:bg-orange-400"
            >
              {slide.cta}
              <span className="mr-2" aria-hidden>←</span>
            </Link>
          </div>
        </div>

        <div className="relative flex items-center justify-between border-t border-white/[0.06] px-5 py-3 sm:px-8">
          <span className="text-[11px] text-amber-100/35">{paused ? 'توقف موقت' : 'معرفی کوتاه امکانات'}</span>
          <div className="flex items-center gap-1.5" role="tablist" aria-label="اسلایدهای معرفی">
            {slides.map((item, index) => (
              <button
                key={item.title}
                type="button"
                role="tab"
                aria-selected={index === active}
                aria-label={`اسلاید ${index + 1}: ${item.eyebrow}`}
                onClick={() => setActive(index)}
                className={`h-1.5 rounded-full transition-all ${index === active ? 'w-7 bg-orange-400' : 'w-1.5 bg-white/20 hover:bg-white/40'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
