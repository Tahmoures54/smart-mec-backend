import Image from 'next/image';
import Link from 'next/link';
import carsData from '@/data/cars.json';
import { SITE, getDownloadLinks } from '@/lib/site';
import { EnamadSeal } from './_components/enamad-seal';
import { SiteShell } from './_components/site-shell';

const FEATURES = [
  {
    title: 'عیب‌یابی با هوش مصنوعی',
    body: 'شرح مشکل را بنویس؛ علت‌های محتمل، هشدار کلاهبرداری و توصیه عملی می‌گیری.',
    icon: '🧠',
  },
  {
    title: 'تحلیل صدای موتور',
    body: 'تق‌تق، تقه یا صدای غیرعادی را ضبط کن تا اپ آن را برای تشخیص کمک کند.',
    icon: '🎤',
  },
  {
    title: 'تعمیرگاه نزدیک',
    body: 'روی نقشه ببین کدام تعمیرگاه به تو نزدیک‌تر است و با آمادگی بیشتری مراجعه کن.',
    icon: '📍',
  },
  {
    title: 'اعتبار و اشتراک طلایی',
    body: 'با بستهٔ اعتباری یا اشتراک طلایی، سوال‌های بعدی را همان‌جا ادامه بده.',
    icon: '👑',
  },
  {
    title: 'معرفی دوستان',
    body: 'کد دعوت بده، از خرید دوستانت سهم بگیر و در صورت رسیدن به سقف، برداشت کن.',
    icon: '👥',
  },
  {
    title: 'تاریخچه عیب‌یابی',
    body: 'نتیجه‌ها ذخیره می‌شوند تا بعداً مرور کنی یا سوال پیگیری بپرسی.',
    icon: '📋',
  },
];

const STEPS = [
  {
    n: '۱',
    title: 'در وب شروع کن',
    body: 'همین حالا عیب‌یابی آنلاین را باز کن؛ اگر خواستی بعداً اپ اندروید را هم نصب کن.',
  },
  {
    n: '۲',
    title: 'خودرو و مشکل را بگو',
    body: 'با شماره موبایل وارد شو، ماشین را انتخاب کن و شرح بده — یا صدای موتور را بفرست.',
  },
  {
    n: '۳',
    title: 'راهنمایی بگیر و اقدام کن',
    body: 'علت‌های محتمل را بخوان و اگر لازم شد حضوری به تعمیرگاه مراجعه کن.',
  },
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
    '@type': 'MobileApplication',
    name: SITE.nameFa,
    alternateName: SITE.nameEn,
    operatingSystem: 'Android',
    applicationCategory: 'UtilitiesApplication',
    description: SITE.description,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'IRR' },
  };

  return (
    <SiteShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main>
        <section className="hero-grid relative overflow-hidden">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-2 md:py-24">
            <div>
              <p className="mb-4 inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-sm text-emerald-200">
                دارای نماد اعتماد الکترونیکی · پرداخت امن
              </p>
              <h1 className="text-4xl font-extrabold leading-tight text-white md:text-5xl">
                مکانیک همیشه
                <span className="block bg-gradient-to-l from-amber-200 via-orange-400 to-amber-500 bg-clip-text text-transparent">
                  همراه ماشینت
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-amber-100/80">{SITE.description}</p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/diagnose"
                  className="inline-flex items-center justify-center rounded-2xl bg-orange-500 px-6 py-3.5 text-base font-bold text-white shadow-[0_12px_40px_rgba(255,122,26,0.35)] hover:bg-orange-400"
                >
                  شروع عیب‌یابی آنلاین
                </Link>
                <a
                  href="/download"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/15 px-6 py-3.5 text-base font-semibold text-amber-100 hover:border-orange-400/50 hover:text-white"
                >
                  دانلود اپ اندروید
                </a>
              </div>

              <dl className="mt-10 grid grid-cols-3 gap-4 text-center sm:text-right">
                <div>
                  <dt className="text-xs text-amber-100/50">خودرو در کاتالوگ</dt>
                  <dd className="mt-1 text-2xl font-bold text-amber-300">{carCount}+</dd>
                </div>
                <div>
                  <dt className="text-xs text-amber-100/50">ورود</dt>
                  <dd className="mt-1 text-2xl font-bold text-amber-300">OTP</dd>
                </div>
                <div>
                  <dt className="text-xs text-amber-100/50">پرداخت</dt>
                  <dd className="mt-1 text-lg font-bold text-amber-300">درگاه بانکی</dd>
                </div>
              </dl>
            </div>

            <div className="relative mx-auto w-full max-w-sm">
              <div className="absolute inset-8 rounded-full bg-orange-500/20 blur-3xl" />
              <div className="relative rounded-[2.2rem] border border-white/12 bg-[#1A120E] p-3 shadow-2xl">
                <div className="rounded-[1.7rem] bg-[#0D0D12] px-5 pb-8 pt-6">
                  <div className="mb-6 flex items-center gap-3">
                    <Image
                      src="/branding/app_icon.png"
                      alt=""
                      width={56}
                      height={56}
                      className="h-14 w-14 rounded-2xl"
                    />
                    <div>
                      <p className="font-bold">{SITE.nameFa}</p>
                      <p className="text-xs text-amber-100/60">{SITE.tagline}</p>
                    </div>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="rounded-2xl rounded-tl-sm bg-orange-500/15 p-3 text-amber-50">
                      صدای موتور مثل تق‌تق میاد، مخصوصاً صبح‌ها. خطرناکه؟
                    </div>
                    <div className="rounded-2xl rounded-tr-sm bg-white/5 p-3 text-amber-100/90">
                      رفیق، اول آرام باش. تا سه علت محتمل را برات می‌نویسم و می‌گم کجا ممکنه سرت کلاه بره.
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <span className="rounded-full bg-amber-400/15 px-3 py-1 text-xs text-amber-200">
                        هشدار کلاهبرداری
                      </span>
                      <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                        تعمیرگاه نزدیک
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-bold">این اپ چه کمکی بهت می‌کند؟</h2>
          <p className="mt-3 max-w-2xl text-amber-100/70">
            به‌جای سرچ پراکنده یا تشخیص گران‌قیمتِ اول کار، یک راهنمای اولیهٔ قابل‌فهم می‌گیری تا با مکانیک راحت‌تر حرف بزنی.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-orange-400/40"
              >
                <div className="mb-3 text-2xl">{item.icon}</div>
                <h3 className="text-lg font-semibold text-amber-100">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-amber-100/70">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how" className="border-y border-white/10 bg-black/20">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-3xl font-bold">از نصب تا نتیجه، سه قدم</h2>
            <ol className="mt-10 grid gap-6 md:grid-cols-3">
              {STEPS.map((step) => (
                <li key={step.n} className="rounded-2xl border border-orange-400/20 bg-[#1A120E] p-6">
                  <span className="text-3xl font-black text-orange-400">{step.n}</span>
                  <h3 className="mt-3 text-xl font-bold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-amber-100/70">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="download" className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-bold">دانلود اپ مکانیک هوشمند</h2>
          <p className="mt-3 max-w-2xl text-amber-100/70">
            نسخهٔ اندروید همین حالا با فایل APK نصب می‌شود. فروشگاه‌ها به‌محض انتشار فعال می‌شوند.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {downloads.map((item) => {
              const ready = Boolean(item.href);
              const className =
                'flex h-full flex-col rounded-2xl border p-5 ' +
                (ready
                  ? 'border-orange-400/40 bg-orange-500/10 hover:bg-orange-500/15'
                  : 'border-white/10 bg-white/[0.02] opacity-80');
              const inner = (
                <>
                  <StoreIcon id={item.id} />
                  <h3 className="mt-4 text-xl font-bold">{item.title}</h3>
                  <p className="mt-1 grow text-sm text-amber-100/70">{item.subtitle}</p>
                  <span className="mt-4 text-sm font-semibold text-orange-300">
                    {ready ? 'شروع دانلود ←' : 'هنوز لینک فعال نشده'}
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
                <div key={item.id} className={className}>
                  {inner}
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-sm leading-7 text-amber-100/55">
            برای نصب مستقیم APK، در تنظیمات اندروید اجازهٔ نصب از منابع ناشناس را بدهید. اگر فایل را از همین سایت
            دانلود می‌کنید، منبع همان سرور رسمی اپ است.
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20">
          <div className="flex flex-col items-center gap-8 rounded-2xl border border-emerald-400/25 bg-emerald-400/5 p-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <p className="font-bold text-emerald-200">اعتماد رسمی و پرداخت امن</p>
              <p className="mt-2 leading-8 text-amber-100/80">
                این سایت نماد اعتماد الکترونیکی دارد. خرید بسته و اشتراک از درگاه بانکی پی‌پینگ انجام می‌شود و اعتبار
                همان لحظه روی حسابت می‌نشیند.
              </p>
              <Link
                href="/diagnose"
                className="mt-5 inline-flex items-center justify-center rounded-2xl bg-orange-500 px-6 py-3 text-base font-bold text-white hover:bg-orange-400"
              >
                شروع عیب‌یابی و خرید بسته
              </Link>
            </div>
            <EnamadSeal />
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
