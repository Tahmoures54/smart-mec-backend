'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { clearWebToken, readWebToken, saveWebToken } from '@/lib/web-auth';
import { getBuyAbVariant, track } from '@/lib/analytics';

type Profile = {
  phone: string;
  credits: number;
  isGolden: boolean;
  remainingFree?: number | null;
};

type Product = {
  id: string;
  name: string;
  title?: string;
  price: number;
  credits?: number;
  goldenDays?: number;
  days?: number;
};

async function api<T>(
  path: string,
  options: { method?: string; token?: string | null; json?: unknown } = {}
): Promise<{ ok: boolean; status: number; body: T & { success?: boolean; error?: string } }> {
  const headers: HeadersInit = {};
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.json !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(path, {
    method: options.method || 'GET',
    headers,
    body: options.json !== undefined ? JSON.stringify(options.json) : undefined,
  });
  const body = (await res.json().catch(() => ({}))) as T & { success?: boolean; error?: string };
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

  // برای جلوگیری از hydration mismatch، مقدار اولیه 'a' است و در effect
  // بعد از mount با مقدار واقعی localStorage جایگزین می‌شود.
  const [buyAb, setBuyAb] = useState<'a' | 'b'>('a');

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
    const v = getBuyAbVariant();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBuyAb(v);
    track('buy_view', { reason, variant: v });
  }, [reason]);

  useEffect(() => {
    void (async () => {
      const { body } = await api<{ data?: Product[] }>('/api/products');
      const list = Array.isArray(body.data) ? body.data : [];
      setProducts(list);
    })();
  }, []);

  useEffect(() => {
    if (!token) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
  const garagePacks = useMemo(
    () =>
      products
        .filter((p) => p.id === 'garage_silver_30' || p.id === 'garage_gold_30')
        .sort((a, b) => a.price - b.price),
    [products]
  );

  async function sendOtp() {
    setError('');
    setLoading(true);
    try {
      const { ok, body } = await api<{ otp?: string }>('/api/account', {
        method: 'POST',
        json: { action: 'send', phone },
      });
      if (!ok) throw new Error(body.error || 'ارسال کد ناموفق');
      setOtpSent(true);
      setDevOtp(body.otp || '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا');
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setError('');
    setLoading(true);
    try {
      const { ok, body } = await api<{ token?: string }>('/api/account', {
        method: 'POST',
        json: { action: 'verify', phone, code: otp },
      });
      if (!ok || !body.token) throw new Error(body.error || 'ورود ناموفق');
      saveWebToken(body.token);
      setToken(body.token);
      setShowLogin(false);
      const prod = pendingProduct;
      setPendingProduct(null);
      setOtp('');
      setOtpSent(false);
      if (prod) await buy(prod, body.token);
      else await loadProfile(body.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا');
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
    track('buy_click', { productId, variant: buyAb, reason });
    setError('');
    try {
      const { ok, body } = await api<{ paymentUrl?: string }>('/api/purchase', {
        method: 'POST',
        token: auth,
        json: { productId, from: 'web' },
      });
      if (!ok || !body.paymentUrl) throw new Error(body.error || 'ساخت تراکنش ناموفق');
      window.location.assign(body.paymentUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در پرداخت');
      setBuyingId(null);
    }
  }

  function packSubtitle(p: Product) {
    if (p.goldenDays && p.goldenDays > 0) {
      const days = p.days || p.goldenDays;
      return `اشتراک طلایی ${days} روزه`;
    }
    const c = p.credits || 0;
    return `${c.toLocaleString('fa-IR')} اعتبار عیب‌یابی`;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mx-auto max-w-2xl text-center">
        {fromEmpty ? (
          <p className="mb-2 text-sm font-semibold text-orange-300">
            اعتبارت تمام شده — با یک بسته کوچک دوباره شروع کن
          </p>
        ) : null}
        <h1 className="text-3xl font-extrabold text-amber-50 md:text-4xl">
          {buyAb === 'a'
            ? 'جلوی هزینهٔ اضافهٔ تعمیرگاه را بگیر'
            : 'هر سوال یک قدم نزدیک‌تر به تشخیص درست'}
        </h1>
        <p className="mt-3 text-amber-100/75">
          {buyAb === 'a'
            ? 'یک تشخیص غلط گاهی چند برابر قیمت کل بسته برایت آب می‌خورد. با آمادگی برو تعمیرگاه.'
            : 'با اعتبار یا طلایی، سوال و follow-up قطع نمی‌شود — همان لحظه بعد از پرداخت فعال می‌شود.'}
        </p>
        {profile ? (
          <p className="mt-3 text-sm text-amber-100/55">
            {profile.phone}
            {profile.isGolden ? (
              <span className="mr-2 text-amber-300"> · طلایی</span>
            ) : (
              <span className="mr-2"> · اعتبار فعلی: {profile.credits.toLocaleString('fa-IR')}</span>
            )}
          </p>
        ) : (
          <p className="mt-3 text-sm text-amber-100/50">
            برای پرداخت باید وارد شوی — بعد از خرید، اعتبار بلافاصله فعال می‌شود.
          </p>
        )}
      </div>

      <div className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
        {SALES_POINTS.map((x) => (
          <div key={x.t} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-right">
            <h3 className="text-sm font-bold text-amber-100">{x.t}</h3>
            <p className="mt-1 text-xs leading-6 text-amber-100/55">{x.d}</p>
          </div>
        ))}
      </div>

      {error ? <p className="mt-6 text-center text-sm text-red-300">{error}</p> : null}

      <h2 className="mt-12 text-xl font-bold text-amber-100">بسته اعتبار</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {creditPacks.map((p) => {
          const hot = HIGHLIGHT_IDS.has(p.id);
          return (
            <div
              key={p.id}
              className={`rounded-2xl border p-5 ${
                hot
                  ? 'border-orange-400/50 bg-orange-500/10 shadow-[0_0_32px_rgba(255,122,26,0.12)]'
                  : 'border-white/10 bg-[#1A120E]'
              }`}
            >
              {hot ? (
                <span className="text-[11px] font-bold text-orange-300">پیشنهاد محبوب</span>
              ) : null}
              <h3 className="mt-1 text-lg font-bold text-amber-50">{p.name || p.title}</h3>
              <p className="text-sm text-amber-100/55">{packSubtitle(p)}</p>
              <p className="mt-3 text-2xl font-extrabold text-orange-300">{formatToman(p.price)}</p>
              <button
                type="button"
                disabled={!!buyingId}
                onClick={() => void buy(p.id)}
                className="mt-4 w-full rounded-xl bg-orange-500 py-2.5 text-sm font-bold text-white hover:bg-orange-400 disabled:opacity-50"
              >
                {buyingId === p.id ? 'در حال انتقال به درگاه…' : 'خرید و فعال‌سازی'}
              </button>
            </div>
          );
        })}
      </div>

      <h2 className="mt-12 text-xl font-bold text-amber-100">اشتراک طلایی</h2>
      <p className="mt-1 text-sm text-amber-100/55">
        اگر زیاد سوال داری یا چند خودرو داری، طلایی به‌صرفه‌تر از خرید تکی اعتبار است
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {goldPacks.map((p) => (
          <div key={p.id} className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5">
            <h3 className="text-lg font-bold text-amber-50">{p.name || p.title}</h3>
            <p className="text-sm text-amber-100/55">{packSubtitle(p)}</p>
            <p className="mt-3 text-2xl font-extrabold text-amber-300">{formatToman(p.price)}</p>
            <button
              type="button"
              disabled={!!buyingId}
              onClick={() => void buy(p.id)}
              className="mt-4 w-full rounded-xl bg-amber-500/90 py-2.5 text-sm font-bold text-black hover:bg-amber-400 disabled:opacity-50"
            >
              {buyingId === p.id ? 'در حال انتقال…' : 'فعال‌سازی طلایی'}
            </button>
          </div>
        ))}
      </div>

      <section className="mt-14 rounded-3xl border border-orange-400/25 bg-gradient-to-b from-orange-500/10 to-transparent p-6 md:p-8">
        <p className="text-sm font-semibold text-orange-300">مخصوص تعمیرگاه‌ها</p>
        <h2 className="mt-1 text-2xl font-extrabold text-amber-50">معرفی در چت عیب‌یابی</h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-amber-100/75">
          مسیر: ثبت تعمیرگاه → خرید پکیج → تأیید ادمین → نمایش در چت.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {(garagePacks.length
            ? garagePacks
            : [
                { id: 'garage_silver_30', name: 'معرفی نقره‌ای ۳۰ روز', price: 299000 },
                { id: 'garage_gold_30', name: 'معرفی طلایی ۳۰ روز', price: 599000 },
              ]
          ).map((p) => (
            <div key={p.id} className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <h3 className="font-bold text-amber-50">{p.name || p.id}</h3>
              <p className="mt-1 text-lg font-extrabold text-orange-300">{formatToman(p.price)}</p>
            </div>
          ))}
        </div>
        <a
          href="/garage"
          className="mt-6 inline-flex rounded-2xl bg-orange-500 px-6 py-3 text-sm font-bold text-white hover:bg-orange-400"
        >
          ثبت تعمیرگاه و خرید پکیج معرفی
        </a>
      </section>

      {showLogin ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#1A120E] p-5">
            <h2 className="text-xl font-bold">ورود برای خرید</h2>
            <label className="mt-4 block text-sm">
              موبایل
              <input
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2"
              />
            </label>
            {otpSent ? (
              <label className="mt-3 block text-sm">
                کد
                <input
                  dir="ltr"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                />
              </label>
            ) : null}
            {devOtp ? <p className="mt-2 text-xs text-amber-300">کد توسعه: {devOtp}</p> : null}
            <div className="mt-4 flex gap-2">
              {!otpSent ? (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void sendOtp()}
                  className="flex-1 rounded-xl bg-orange-500 py-2 font-semibold"
                >
                  ارسال کد
                </button>
              ) : (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void verifyOtp()}
                  className="flex-1 rounded-xl bg-orange-500 py-2 font-semibold"
                >
                  ورود و ادامه خرید
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowLogin(false)}
                className="rounded-xl bg-white/10 px-4"
              >
                بعداً
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
