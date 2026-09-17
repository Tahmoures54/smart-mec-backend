import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import carsData from '@/data/cars.json';
import { ENAMAD_CODE } from '@/lib/enamad';
import { SITE, getDownloadLinks } from '@/lib/site';
import { SiteShell } from './_components/site-shell';

export const metadata: Metadata = {
  title: `${SITE.nameFa} | عیب‌یابی هوشمند خودرو — قبل از تعمیرگاه`,
  description:
    'قبل از رفتن به تعمیرگاه بفهم مشکل ماشینت چیه. عیب‌یابی با هوش مصنوعی، تحلیل صدای موتور و راهنمای هوشمند تا سرت کلاه نره.',
  alternates: { canonical: '/' },
  openGraph: {
    title: `${SITE.nameFa} — قبل از تعمیرگاه، هوشمند باش`,
    description:
      'هزینهٔ اشتباه تشخیص را نده. مشکل را بنویس یا صدای موتور را بفرست؛ در چند ثانیه راهنمایی شفاف بگیر.',
    type: 'website',
    locale: 'fa_IR',
    siteName: SITE.nameFa,
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.nameFa} — عیب‌یابی هوشمند خودرو`,
    description: 'قبل از تعمیرگاه بفهم چه خبر است. صرفه‌جویی در زمان و پول.',
  },
  robots: { index: true, follow: true },
};

const PAINS = [
  {
    icon: '💸',
    title: 'تشخیص اشتباه = پول دور ریختن',
    body: 'گاهی فقط به‌خاطر یک حدس اولیه، قطعه عوض می‌شود و مشکل سر جایش می‌ماند.',
  },
  {
    icon: '😶‍🌫️',
    title: 'نمی‌دانی به مکانیک چه بگویی',
    body: 'وقتی زبان فنی بلد نیستی، راحت‌تر سرت کلاه می‌رود یا مسیر اشتباه پیشنهاد می‌شود.',
  },
  {
    icon: '⏱️',
    title: 'ساعت‌ها سرچ بی‌نتیجه',
    body: 'فروم و ویدیوهای پراکنده بیشتر گیجت می‌کند تا راهنمایی‌ات کند.',
  },
];

const BENEFITS = [
  {
    icon: '🎯',
    title: 'بفهم مشکل از کجاست',
    body: 'شرح مشکل یا صدای موتور را بده؛ علت‌های محتمل را شفاف و به‌ترتیب اولویت می‌گیری.',
  },
  {
    icon: '🛡️',
    title: 'هوشیار برو تعمیرگاه',
    body: 'با چک‌لیست ذهنی وارد شو تا پیشنهادهای غیرضروری را راحت‌تر تشخیص دهی.',
  },
  {
    icon: '💰',
    title: 'هزینهٔ اشتباه را کم کن',
    body: 'یک عیب‌یابی درست، گاهی معادل ده‌ها برابر هزینهٔ یک بسته اعتبار برایت صرفه‌جویی می‌کند.',
  },
  {
    icon: '🎤',
    title: 'تحلیل صدای موتور',
    body: 'تق‌تق، تقه یا صدای غیرعادی را ضبط کن؛ هوش مصنوعی کمک می‌کند جهت تشخیص را محدود کنی.',
  },
  {
    icon: '📍',
    title: 'تعمیرگاه نزدیک',
    body: 'بعد از تشخیص، نزدیک‌ترین گزینه‌ها را ببین و با آمادگی بیشتری اقدام کن.',
  },
  {
    icon: '👑',
    title: 'اشتراک طلایی نامحدودتر',
    body: 'اگر زیاد سوال داری، طلایی بگیر و بدون نگرانی از اعتبار ادامه بده.',
  },
];

const PACKS = [
  {
    id: 'credit_10',
    name: 'شروع هوشمند',
    price: '۲۸٬۰۰۰',
    unit: 'تومان',
    badge: null as string | null,
    points: ['۱۰ اعتبار عیب‌یابی', 'مناسب تست و شروع', 'فعال‌سازی آنی'],
    cta: 'شروع با این بسته',
    highlight: false,
  },
  {
    id: 'credit_50',
    name: 'پرفروش',
    price: '۱۲۰٬۰۰۰',
    unit: 'تومان',
    badge: 'پیشنهاد اکثر کاربران',
    points: ['۵۰ اعتبار', 'به‌صرفه‌تر از خرید تکی', 'مناسب خانواده / چند خودرو'],
    cta: 'انتخاب پرفروش',
    highlight: true,
  },
  {
    id: 'gold_monthly',
    name: 'طلایی ماهانه',
    price: '۹۹٬۰۰۰',
    unit: 'تومان',
    badge: 'بدون نگرانی اعتبار',
    points: ['۳۰ روز اشتراک طلایی', 'سقف ماهانه بالا', 'ادامهٔ گفتگو بدون قطع'],
    cta: 'طلایی شو',
    highlight: false,
  },
];

const PROOFS = [
  { value: 'بانک فنی گسترده', label: 'پوشش خودروهای پرتیراژ ایران' },
  { value: 'متن + صدا', label: 'دو راه برای توصیف مشکل' },
  { value: 'چند ثانیه', label: 'از شرح مشکل تا راهنمایی اولیه' },
  { value: 'قبل از تعمیرگاه', label: 'تصمیم آگاهانه‌تر و هزینهٔ کمتر' },
];

function StoreIcon({ id }: { id: 'apk' | 'bazaar' | 'play' }) {
  if (id === 'bazaar') {
    return (
      <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden>
        <path fill="#4CAF50" d="M4 4h7v7H4z" />
        <path fill="#FFC107" d="M13 4h7v7h-7z" />
        <path fill="#2196F3" d="M4 13h7v7H4z" />
        <path fill="#FF5722" d="M13 13h7v7h-7z" />
      </svg>
    );
  }
  if (id === 'play') {
    return (
      <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden>
        <path fill="#EA4335" d="M3 3.5v17l11-8.5z" />
        <path fill="#FBBC04" d="M14 12 3 20.5 19.5 15z" />
        <path fill="#34A853" d="M14 12 19.5 9 3 3.5z" />
        <path fill="#4285F4" d="M19.5 9 14 12l5.5 3L22 12z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8 text-emerald-400" fill="currentColor" aria-hidden>
      <path d="M17 1H7a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2Zm0 18H7V5h10v14Z" />
    </svg>
  );
}

export default function Home() {
  const carCount = Array.isArray(carsData) ? carsData.length : 0;
  const downloads = getDownloadLinks();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: SITE.nameFa,
        alternateName: SITE.nameEn,
        url: '/',
        inLanguage: 'fa-IR',
      },
      {
        '@type': 'MobileApplication',
        name: SITE.nameFa,
        alternateName: SITE.nameEn,
        operatingSystem: 'Android',
        applicationCategory: 'UtilitiesApplication',
        description: SITE.description,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'IRR' },
        inLanguage: 'fa-IR',
      },
    ],
  };

  return (
    <SiteShell>
      {ENAMAD_CODE ? <meta name="enamad" content={ENAMAD_CODE} /> : null}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,122,26,0.12),_transparent_55%)]" />
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-2 md:py-24">
            <div>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-400/40 bg-orange-500/15 px-3 py-1 text-sm font-medium text-orange-200">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-400" />
                قبل از تعمیرگاه، هوشمند تصمیم بگیر
              </p>

              <h1 className="text-4xl font-extrabold leading-[1.25] text-white md:text-5xl">
                نذار به‌خاطر یک حدس
                <span className="mt-1 block bg-gradient-to-l from-amber-200 via-orange-400 to-amber-500 bg-clip-text text-transparent">
                  پولت هدر بره
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-lg leading-8 text-amber-50/90">
                مشکل ماشین را بنویس یا صدای موتور را بفرست. در چند ثانیه بفهم{' '}
                <strong className="text-white">احتمالاً از کجاست</strong>، چه سوالی از مکانیک بپرسی
                و کجا ممکن است مسیر اشتباه پیشنهاد شود.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/diagnose"
                  className="inline-flex items-center justify-center rounded-2xl bg-orange-500 px-7 py-4 text-base font-bold text-white shadow-[0_12px_40px_rgba(255,122,26,0.4)] transition hover:bg-orange-400 hover:shadow-[0_16px_48px_rgba(255,122,26,0.5)]"
                >
                  رایگان شروع کن — عیب‌یابی آنلاین
                </Link>
                <Link
                  href="#pricing"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/20 px-6 py-4 text-base font-semibold text-amber-100 transition hover:border-orange-400/60 hover:text-white"
                >
                  ببین بسته‌ها چقدر به‌صرفه‌اند
                </Link>
              </div>

              <p className="mt-4 text-sm text-amber-100/55">
                ورود با شماره موبایل · بدون نصب اجباری · نتیجه همان لحظه
              </p>

              <dl className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {PROOFS.map((p) => (
                  <div
                    key={p.label}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-center"
                  >
                    <dt className="text-[11px] leading-4 text-amber-100/50">{p.label}</dt>
                    <dd className="mt-1 text-sm font-bold text-amber-200">{p.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="relative mx-auto w-full max-w-sm">
              <div className="absolute inset-6 rounded-full bg-orange-500/25 blur-3xl" />
              <div className="relative rounded-[2.2rem] border border-white/12 bg-[#1A120E] p-3 shadow-2xl">
                <div className="rounded-[1.7rem] bg-[#0D0D12] px-5 pb-8 pt-6">
                  <div className="mb-6 flex items-center gap-3">
                    <Image
                      src="/branding/app_icon.png"
                      alt={SITE.nameFa}
                      width={56}
                      height={56}
                      className="h-14 w-14 rounded-2xl"
                      priority
                    />
                    <div>
                      <p className="font-bold">{SITE.nameFa}</p>
                      <p className="text-xs text-emerald-300/90">آنلاین · آماده پاسخ</p>
                    </div>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="rounded-2xl rounded-tl-sm bg-orange-500/20 p-3 text-amber-50">
                      صبح‌ها تق‌تق از موتور می‌آد و سخت روشن می‌شه. نریم قطعه الکی عوض کنیم؟
                    </div>
                    <div className="rounded-2xl rounded-tr-sm bg-white/5 p-3 leading-7 text-amber-100/90">
                      سه مسیر محتمل برات مرتب کردم. اول اینا را چک کن؛ اگر کسی گفت «همه‌ش را عوض
                      کنیم» بپرس چرا — لیست سوال‌های هوشمند هم پایین است.
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs text-emerald-200">
                        صرفه‌جویی در هزینه
                      </span>
                      <span className="rounded-full bg-amber-400/15 px-3 py-1 text-xs text-amber-200">
                        سوال آماده برای مکانیک
                      </span>
                    </div>
                  </div>
                  <Link
                    href="/diagnose"
                    className="mt-6 flex w-full items-center justify-center rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-400"
                  >
                    همین الان مشکل ماشینت را بگو
                  </Link>
                </div>
              </div>
              {carCount > 0 ? (
                <p className="relative mt-4 text-center text-xs text-amber-100/45">
                  بیش از {carCount.toLocaleString('fa-IR')} مدل در کاتالوگ فنی
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-black/25">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 className="text-center text-2xl font-bold md:text-3xl">
              این صحنه‌ها را چند بار دیدی؟
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-amber-100/65">
              اکثر راننده‌ها اول گیج می‌شوند، بعد پول می‌دهند، آخرش هنوز مطمئن نیستند کار درست
              انجام شده یا نه.
            </p>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {PAINS.map((item) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-[#1A120E] p-5"
                >
                  <div className="text-2xl" aria-hidden>
                    {item.icon}
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-amber-100">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-amber-100/70">{item.body}</p>
                </article>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link
                href="/diagnose"
                className="inline-flex rounded-2xl bg-white/10 px-6 py-3 text-sm font-semibold text-orange-200 ring-1 ring-orange-400/30 hover:bg-orange-500 hover:text-white"
              >
                این بار با آمادگی برو جلو ←
              </Link>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-bold">چرا راننده‌های باهوش از اینجا شروع می‌کنند؟</h2>
          <p className="mt-3 max-w-2xl text-amber-100/70">
            هدف ساده است: با اطلاعات بهتر تصمیم بگیری، کمتر غافلگیر شوی و فقط وقتی لازم است هزینه
            کنی.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-orange-400/40"
              >
                <div className="mb-3 text-2xl" aria-hidden>
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold text-amber-100">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-amber-100/70">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-white/10 bg-gradient-to-b from-orange-500/5 to-transparent">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-center text-3xl font-bold">از الان تا نتیجه، زیر ۲ دقیقه</h2>
            <ol className="mt-10 grid gap-6 md:grid-cols-3">
              {[
                {
                  n: '۱',
                  t: 'وارد شو',
                  b: 'با شماره موبایل؛ سریع و بدون دردسر.',
                },
                {
                  n: '۲',
                  t: 'مشکل را بگو',
                  b: 'خودرو را انتخاب کن، شرح بنویس یا صدای موتور را بفرست.',
                },
                {
                  n: '۳',
                  t: 'با اعتماد اقدام کن',
                  b: 'راهنمایی شفاف بگیر و اگر لازم شد، آماده‌تر به تعمیرگاه برو.',
                },
              ].map((s) => (
                <li
                  key={s.n}
                  className="relative rounded-2xl border border-orange-400/25 bg-[#1A120E] p-6"
                >
                  <span className="text-3xl font-black text-orange-400">{s.n}</span>
                  <h3 className="mt-3 text-xl font-bold">{s.t}</h3>
                  <p className="mt-2 text-sm leading-7 text-amber-100/70">{s.b}</p>
                </li>
              ))}
            </ol>
            <div className="mt-10 flex justify-center">
              <Link
                href="/diagnose"
                className="rounded-2xl bg-orange-500 px-8 py-4 text-base font-bold text-white shadow-[0_12px_40px_rgba(255,122,26,0.35)] hover:bg-orange-400"
              >
                شروع عیب‌یابی — الان
              </Link>
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl px-4 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-orange-300">سرمایه‌گذاری کوچک، جلوگیری از هزینهٔ بزرگ</p>
            <h2 className="mt-2 text-3xl font-bold">یک تشخیص اشتباه گران‌تر از کل بسته است</h2>
            <p className="mt-3 text-amber-100/70">
              هزینهٔ یک قطعهٔ اشتباه یا اجرت بیهوده را با قیمت بسته‌ها مقایسه کن. کاربران معمولاً از
              پک پرفروش شروع می‌کنند.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {PACKS.map((pack) => (
              <article
                key={pack.id}
                className={
                  'relative flex flex-col rounded-2xl border p-6 ' +
                  (pack.highlight
                    ? 'border-orange-400/60 bg-orange-500/10 shadow-[0_0_40px_rgba(255,122,26,0.15)]'
                    : 'border-white/10 bg-white/[0.03]')
                }
              >
                {pack.badge ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white">
                    {pack.badge}
                  </span>
                ) : null}
                <h3 className="text-xl font-bold text-amber-50">{pack.name}</h3>
                <p className="mt-4">
                  <span className="text-3xl font-black text-white">{pack.price}</span>
                  <span className="mr-1 text-sm text-amber-100/60">{pack.unit}</span>
                </p>
                <ul className="mt-5 flex-1 space-y-2 text-sm text-amber-100/75">
                  {pack.points.map((pt) => (
                    <li key={pt} className="flex gap-2">
                      <span className="text-orange-400">✓</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/diagnose"
                  className={
                    'mt-6 block rounded-xl py-3 text-center text-sm font-bold transition ' +
                    (pack.highlight
                      ? 'bg-orange-500 text-white hover:bg-orange-400'
                      : 'bg-white/10 text-amber-100 hover:bg-white/15')
                  }
                >
                  {pack.cta}
                </Link>
              </article>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-amber-100/55">
            بعد از ورود در صفحه عیب‌یابی می‌توانی بسته را انتخاب و آنلاین پرداخت کنی. فعال‌سازی آنی
            است.
          </p>
        </section>

        <section id="download" className="border-t border-white/10 bg-black/20">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-3xl font-bold">اپ را هم داشته باش</h2>
            <p className="mt-3 max-w-2xl text-amber-100/70">
              عیب‌یابی وب همین حالا باز است. اگر دوست داری همیشه روی گوشی باشد، APK را نصب کن.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {downloads.map((item) => {
                const ready = Boolean(item.href);
                const className =
                  'flex h-full flex-col rounded-2xl border p-5 transition-colors ' +
                  (ready
                    ? 'border-orange-400/40 bg-orange-500/10 hover:bg-orange-500/15'
                    : 'border-white/10 bg-white/[0.02] opacity-80');
                const inner = (
                  <>
                    <StoreIcon id={item.id} />
                    <h3 className="mt-4 text-xl font-bold">{item.title}</h3>
                    <p className="mt-1 grow text-sm text-amber-100/70">{item.subtitle}</p>
                    <span className="mt-4 text-sm font-semibold text-orange-300">
                      {ready ? 'شروع دانلود ←' : 'به‌زودی'}
                    </span>
                  </>
                );
                return ready ? (
                  <a
                    key={item.id}
                    href={item.href!}
                    className={className}
                    {...(item.href!.startsWith('http')
                      ? { target: '_blank', rel: 'noopener noreferrer' }
                      : {})}
                  >
                    {inner}
                  </a>
                ) : (
                  <div key={item.id} className={className} aria-disabled="true">
                    {inner}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="relative overflow-hidden rounded-3xl border border-orange-400/30 bg-gradient-to-l from-orange-600/30 via-[#1A120E] to-[#1A120E] p-8 md:p-12">
            <div className="relative max-w-xl">
              <h2 className="text-2xl font-extrabold md:text-3xl">
                ماشینت امروز صدا می‌دهد؛
                <span className="text-orange-300"> فردا ممکن است دیر باشد</span>
              </h2>
              <p className="mt-4 leading-8 text-amber-100/80">
                یک عیب‌یابی کوتاه الان، می‌تواند جلوی هزینهٔ چند میلیونی اشتباه را بگیرد. از سهمیه
                رایگان شروع کن؛ اگر دیدی به کارت آمد، بسته را بردار و خیالت را راحت کن.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/diagnose"
                  className="inline-flex items-center justify-center rounded-2xl bg-orange-500 px-7 py-4 text-base font-bold text-white hover:bg-orange-400"
                >
                  شروع عیب‌یابی آنلاین
                </Link>
                <Link
                  href="#pricing"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/20 px-6 py-4 text-base font-semibold text-amber-100 hover:border-orange-400/50"
                >
                  مشاهده بسته‌ها
                </Link>
              </div>
            </div>
          </div>
          <p className="mt-6 text-center text-xs leading-6 text-amber-100/35">
            در شرایط اضطراری مانند دود غلیظ، بوی سوختگی شدید یا صدای برخورد فلز، خودرو را متوقف کنید.
          </p>
        </section>
      </main>
    </SiteShell>
  );
}
