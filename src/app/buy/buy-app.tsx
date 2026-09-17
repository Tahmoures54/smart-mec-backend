'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { clearWebToken, readWebToken, saveWebToken } from '@/lib/web-auth';

type Product = {
  id: string;
  name: string;
  title?: string;
  price: number;
  credits?: number;
  goldenDays?: number;
  monthlyLimit?: number;
  days?: number;
};

type Profile = {
  phone: string;
  credits: number;
  isGolden: boolean;
  remainingFree: number | null;
};

async function api<T>(
  path: string,
  options: { method?: string; token?: string | null; json?: unknown } = {}
): Promise<{ ok: boolean; status: number; body: T & { success?: boolean; error?: string; paymentUrl?: string; token?: string; otp?: string } }> {
  const headers: HeadersInit = {};
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.json !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(path, {
    method: options.method || 'GET',
    headers,
    body: options.json !== undefined ? JSON.stringify(options.json) : undefined,
  });
  const body = (await res.json().catch(() => ({}))) as T & {
    success?: boolean;
    error?: string;
    paymentUrl?: string;
    token?: string;
    otp?: string;
  };
  return { ok: res.ok && body.success !== false, status: res.status, body };
}

function formatToman(n: number) {
  return `${n.toLocaleString('fa-IR')} تومان`;
}

const HIGHLIGHT_IDS = new Set(['credit_50', 'gold_monthly']);

const SALES_POINTS = [
  {
    t: 'هزینهٔ یک قطعهٔ اشتباه',
    d: 'گاهی فقط یک تشخیص غلط، چند برابر قیمت کل بسته برایت آب می‌خورد.',
  },
  {
    t: 'با آمادگی برو تعمیرگاه',
    d: 'بدان چه بپرسی تا پیشنهادهای غیرضروری را راحت‌تر تشخیص دهی.',
  },
  {
    t: 'فعال‌سازی آنی',
    d: 'بعد از پرداخت، همان لحظه اعتبار یا طلایی روی حسابت می‌نشیند.',
  },
];

export function BuyApp() {
  const search = useSearchParams();
  const reason = search.get('reason') || '';
  const fromEmpty = reason === 'credits' || reason === 'empty' || reason === '402';

  const [token, setToken] = useState<string | null>(() => readWebToken());
  const [profile, setProfile] = useState<Profile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const [showLogin, setShowLogin] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [pendingProduct, setPendingProduct] = useState<string | null>(null);

  const loadProfile = useCallback(async (t: string) => {
    const { ok, status, body } = await api<{ data?: Profile }>('/api/account/credits', { token: t });
    if (status === 401) {
      clearWebToken();
      setToken(null);
      setProfile(null);
      return;
    }
    if (ok && body.data) setProfile(body.data as Profile);
  }, []);

  useEffect(() => {
    void (async () => {
      const { body } = await api<{ data?: Product[] }>('/api/products');
      const list = Array.isArray(body.data) ? body.data : [];
      setProducts(
        list.filter(
          (p) =>
            p.id.startsWith('credit_') ||
            p.id.startsWith('gold_')
        )
      );
    })();
  }, []);

  useEffect(() => {
    if (!token) return;
    void loadProfile(token);
  }, [token, loadProfile]);

  const creditPacks = useMemo(
    () => products.filter((p) => p.id.startsWith('credit_')).sort((a, b) => a.price - b.price),
    [products]
  );
  const goldPacks = useMemo(
    () => products.filter((p) => p.id.startsWith('gold_')).sort((a, b) => a.price - b.price),
    [products]
  );

  async function sendOtp() {
    setError('');
    setLoading(true);
    try {
      const { ok, body } = await api('/api/account', {
        method: 'POST',
        json: { action: 'send', phone },
      });
      if (!ok) throw new Error(body.error || 'ارسال کد ناموفق بود');
      setOtpSent(true);
      setDevOtp(body.otp || '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در ارسال کد');
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setError('');
    setLoading(true);
    try {
      const { ok, body } = await api('/api/account', {
        method: 'POST',
        json: { action: 'verify', phone, code: otp },
      });
      if (!ok || !body.token) throw new Error(body.error || 'ورود ناموفق بود');
      saveWebToken(body.token);
      setToken(body.token);
      setShowLogin(false);
      setOtp('');
      setOtpSent(false);
      if (pendingProduct) {
        const id = pendingProduct;
        setPendingProduct(null);
        await buy(id, body.token);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در ورود');
    } finally {
      setLoading(false);
    }
  }

  async function buy(productId: string, authOverride?: string) {
    const auth = (authOverride || token || readWebToken() || '').trim();
    if (!auth || auth.length < 10) {
      setPendingProduct(productId);
      setShowLogin(true);
      setError('برای خرید ابتدا وارد شو — فقط چند ثانیه طول می‌کشد.');
      return;
    }
    setBuyingId(productId);
    setError('');
    setLoading(true);
    try {
      const { ok, status, body } = await api('/api/purchase', {
        method: 'POST',
        token: auth,
        json: { productId, from: 'web' },
      });
      if (status === 401) {
        clearWebToken();
        setToken(null);
        setPendingProduct(productId);
        setShowLogin(true);
        setError('نشست شما منقضی شده است. لطفاً دوباره وارد شوید.');
        return;
      }
      if (!ok || !body.paymentUrl) throw new Error(body.error || 'ساخت تراکنش ناموفق بود');
      window.location.href = body.paymentUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در پرداخت');
      setLoading(false);
      setBuyingId(null);
    }
  }

  function packBlurb(p: Product): string {
    if (p.goldenDays && p.goldenDays > 0) {
      const days = p.days || p.goldenDays;
      return `${days} روز طلایی · سقف ماهانه بالا · بدون نگرانی از اعتبار`;
    }
    const c = p.credits || 0;
    return `${c.toLocaleString('fa-IR')} عیب‌یابی · فعال‌سازی آنی`;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <section className="relative overflow-hidden rounded-3xl border border-orange-400/30 bg-gradient-to-l from-orange-600/25 via-[#1A120E] to-[#140C08] p-6 md:p-10">
        {fromEmpty ? (
          <p className="mb-3 inline-flex rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-sm font-medium text-amber-200">
            اعتبارت تمام شده — یک قدم تا ادامه عیب‌یابی
          </p>
        ) : (
          <p className="mb-3 inline-flex rounded-full border border-orange-400/40 bg-orange-500/15 px-3 py-1 text-sm font-medium text-orange-200">
            سرمایه‌گذاری کوچک، جلوگیری از هزینهٔ بزرگ
          </p>
        )}
        <h1 className="max-w-2xl text-3xl font-extrabold leading-tight text-white md:text-4xl">
          {fromEmpty ? (
            <>
              عیب‌یابی‌ات نصفه‌کاره نماند؛
              <span className="mt-1 block text-orange-300">ارزش یک تشخیص درست بیشتر از قیمت بسته است</span>
            </>
          ) : (
            <>
              نذار یک حدس اشتباه
              <span className="mt-1 block text-orange-300">چند برابر این مبلغ برایت آب بخورد</span>
            </>
          )}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-amber-50/85">
          یک قطعهٔ اشتباه یا اجرت بیهوده اغلب از کل بستهٔ اعتبار گران‌تر است. با شارژ حساب، همان لحظه
          ادامه بده و با آمادگی بیشتری به تعمیرگاه برو.
        </p>

        {profile ? (
          <p className="mt-4 text-sm text-amber-100/70">
            حساب: <span dir="ltr">{profile.phone}</span>
            {profile.isGolden ? (
              <span className="mr-2 text-amber-300"> · اشتراک طلایی فعال</span>
            ) : (
              <span className="mr-2"> · اعتبار فعلی: {profile.credits.toLocaleString('fa-IR')}</span>
            )}
          </p>
        ) : (
          <p className="mt-4 text-sm text-amber-100/55">
            برای پرداخت باید وارد شوی — بعد از خرید، اعتبار بلافاصله فعال می‌شود.
          </p>
        )}
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {SALES_POINTS.map((s) => (
          <article key={s.t} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="font-bold text-amber-100">{s.t}</h2>
            <p className="mt-2 text-sm leading-7 text-amber-100/70">{s.d}</p>
          </article>
        ))}
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-bold">بسته‌های اعتبار</h2>
        <p className="mt-2 text-amber-100/65">
          مناسب شروع و استفادهٔ موردی. کاربران معمولاً از پک ۵۰ شروع می‌کنند چون به‌صرفه‌تر است.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {creditPacks.map((p) => {
            const hot = HIGHLIGHT_IDS.has(p.id);
            return (
              <article
                key={p.id}
                className={
                  'relative flex flex-col rounded-2xl border p-5 ' +
                  (hot
                    ? 'border-orange-400/60 bg-orange-500/10 shadow-[0_0_40px_rgba(255,122,26,0.12)]'
                    : 'border-white/10 bg-[#1A120E]')
                }
              >
                {hot ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-3 py-0.5 text-xs font-bold text-white">
                    پیشنهاد پرفروش
                  </span>
                ) : null}
                <h3 className="text-lg font-bold text-amber-50">{p.name || p.title}</h3>
                <p className="mt-3">
                  <span className="text-3xl font-black text-white">{p.price.toLocaleString('fa-IR')}</span>
                  <span className="mr-1 text-sm text-amber-100/55">تومان</span>
                </p>
                <p className="mt-2 grow text-sm text-amber-100/70">{packBlurb(p)}</p>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void buy(p.id)}
                  className={
                    'mt-5 rounded-xl py-3 text-sm font-bold transition disabled:opacity-60 ' +
                    (hot
                      ? 'bg-orange-500 text-white hover:bg-orange-400'
                      : 'bg-white/10 text-amber-100 hover:bg-white/15')
                  }
                >
                  {buyingId === p.id ? 'در حال انتقال به درگاه…' : 'خرید و فعال‌سازی'}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-bold">اشتراک طلایی</h2>
        <p className="mt-2 max-w-2xl text-amber-100/65">
          اگر زیاد سوال داری یا چند خودرو داری، طلایی به‌صرفه‌تر از خرید تکی اعتبار است — بدون قطع شدن
          وسط گفتگو.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {goldPacks.map((p) => {
            const hot = HIGHLIGHT_IDS.has(p.id);
            return (
              <article
                key={p.id}
                className={
                  'relative flex flex-col rounded-2xl border p-5 ' +
                  (hot
                    ? 'border-amber-400/50 bg-amber-400/10'
                    : 'border-white/10 bg-[#1A120E]')
                }
              >
                {hot ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-0.5 text-xs font-bold text-black">
                    محبوب‌ترین
                  </span>
                ) : null}
                <h3 className="text-lg font-bold text-amber-50">{p.name || p.title}</h3>
                <p className="mt-3">
                  <span className="text-3xl font-black text-white">{p.price.toLocaleString('fa-IR')}</span>
                  <span className="mr-1 text-sm text-amber-100/55">تومان</span>
                </p>
                <p className="mt-2 grow text-sm text-amber-100/70">{packBlurb(p)}</p>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void buy(p.id)}
                  className={
                    'mt-5 rounded-xl py-3 text-sm font-bold transition disabled:opacity-60 ' +
                    (hot
                      ? 'bg-amber-500 text-black hover:bg-amber-400'
                      : 'bg-white/10 text-amber-100 hover:bg-white/15')
                  }
                >
                  {buyingId === p.id ? 'در حال انتقال به درگاه…' : 'طلایی شو'}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      {error ? (
        <p className="mt-8 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="mt-12 flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-amber-100">هنوز مطمئن نیستی؟</p>
          <p className="mt-1 text-sm text-amber-100/60">
            اگر سهمیه رایگان داری، از عیب‌یابی شروع کن؛ وقتی دیدی به کارت آمد، برگرد و شارژ کن.
          </p>
        </div>
        <Link
          href="/diagnose"
          className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-amber-100 hover:border-orange-400/50"
        >
          بازگشت به عیب‌یابی
        </Link>
      </div>

      {showLogin ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#1A120E] p-5">
            <h2 className="text-xl font-bold">ورود برای خرید</h2>
            <p className="mt-2 text-sm text-amber-100/70">
              فقط با شماره موبایل — بعد از پرداخت، اعتبار همان لحظه فعال می‌شود.
            </p>
            <label className="mt-4 block text-sm">
              موبایل
              <input
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0912…"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2"
              />
            </label>
            {otpSent ? (
              <label className="mt-3 block text-sm">
                کد تأیید
                <input
                  dir="ltr"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                />
              </label>
            ) : null}
            {devOtp ? <p className="mt-2 text-xs text-amber-300">کد توسعه: {devOtp}</p> : null}
            {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
            <div className="mt-4 flex gap-2">
              {!otpSent ? (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void sendOtp()}
                  className="flex-1 rounded-xl bg-orange-500 py-2 font-semibold disabled:opacity-60"
                >
                  ارسال کد
                </button>
              ) : (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void verifyOtp()}
                  className="flex-1 rounded-xl bg-orange-500 py-2 font-semibold disabled:opacity-60"
                >
                  ورود و ادامه خرید
                </button>
              )}
              <button type="button" onClick={() => setShowLogin(false)} className="rounded-xl bg-white/10 px-4">
                بعداً
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
