'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { clearWebToken, readWebToken, saveWebToken } from '@/lib/web-auth';

type MyGarage = {
  id: number;
  name: string;
  city?: string | null;
  phone?: string | null;
  address?: string | null;
  lat: number;
  lng: number;
  chatStatus?: string;
  showInChat?: boolean;
  subscriptionTier?: string;
  isActive?: boolean;
};

const STATUS_FA: Record<string, string> = {
  none: 'ثبت شده — هنوز پکیج معرفی نخریده‌اید',
  pending_payment: 'در انتظار پرداخت پکیج معرفی',
  pending_review: 'پرداخت شده — در صف تأیید ادمین',
  approved: 'تأیید شده — در چت عیب‌یابی نمایش داده می‌شود',
  rejected: 'رد شده توسط ادمین',
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
  const body = (await res.json().catch(() => ({}))) as T & {
    success?: boolean;
    error?: string;
  };
  return { ok: res.ok && body.success !== false, status: res.status, body };
}

export function GarageApp() {
  const [token, setToken] = useState<string | null>(() => readWebToken());
  const [list, setList] = useState<MyGarage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');

  const [showLogin, setShowLogin] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState('');

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [gPhone, setGPhone] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [description, setDescription] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const loadMine = useCallback(async (t: string) => {
    const { ok, status, body } = await api<{ data?: MyGarage[] }>('/api/garages/register', {
      token: t,
    });
    if (status === 401) {
      clearWebToken();
      setToken(null);
      setList([]);
      return;
    }
    if (ok && Array.isArray(body.data)) setList(body.data);
  }, []);

  useEffect(() => {
    if (!token) return;
    void loadMine(token);
  }, [token, loadMine]);

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
      setOtp('');
      setOtpSent(false);
      await loadMine(body.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا');
    } finally {
      setLoading(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError('مرورگر موقعیت مکانی را پشتیبانی نمی‌کند.');
      return;
    }
    setGeoLoading(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude.toFixed(6)));
        setLng(String(pos.coords.longitude.toFixed(6)));
        setGeoLoading(false);
      },
      () => {
        setError('دسترسی به موقعیت رد شد. مختصات را دستی وارد کن.');
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  async function onRegister(e: FormEvent) {
    e.preventDefault();
    const t = token || readWebToken();
    if (!t) {
      setShowLogin(true);
      setError('برای ثبت تعمیرگاه ابتدا وارد شو.');
      return;
    }
    setLoading(true);
    setError('');
    setOkMsg('');
    try {
      const { ok, body } = await api<{ data?: MyGarage }>('/api/garages/register', {
        method: 'POST',
        token: t,
        json: {
          name,
          city,
          address,
          phone: gPhone || undefined,
          lat: Number(lat),
          lng: Number(lng),
          specialties: specialties
            ? specialties.split(/[،,]/).map((s) => s.trim()).filter(Boolean)
            : [],
          description: description || undefined,
        },
      });
      if (!ok) throw new Error(body.error || 'ثبت ناموفق بود');
      setOkMsg('تعمیرگاه ثبت شد. برای دیده شدن در چت عیب‌یابی، پکیج معرفی بخر.');
      setName('');
      setAddress('');
      setSpecialties('');
      setDescription('');
      await loadMine(t);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ثبت');
    } finally {
      setLoading(false);
    }
  }

  async function buyPromo(productId: string, garageId: number) {
    const t = token || readWebToken();
    if (!t) {
      setShowLogin(true);
      return;
    }
    setBuyingId(`${productId}-${garageId}`);
    setError('');
    try {
      const { ok, body } = await api<{ paymentUrl?: string }>('/api/purchase', {
        method: 'POST',
        token: t,
        json: { productId, garageId, from: 'web' },
      });
      if (!ok || !body.paymentUrl) throw new Error(body.error || 'ساخت تراکنش ناموفق');
      window.location.href = body.paymentUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در پرداخت');
      setBuyingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <p className="text-sm text-amber-200/70">برای تعمیرکاران</p>
        <h1 className="text-3xl font-extrabold text-amber-50">ثبت و معرفی تعمیرگاه</h1>
        <p className="mt-2 text-amber-100/75 leading-7">
          تعمیرگاهت را ثبت کن. بعد از خرید پکیج معرفی و تأیید ادمین، وقتی کاربر نزدیکت عیب‌یابی
          می‌کند، نامت در انتهای نتیجه پیشنهاد می‌شود.
        </p>
        <ol className="mt-4 space-y-1 text-sm text-amber-100/65">
          <li>۱) ورود با موبایل</li>
          <li>۲) ثبت مشخصات و موقعیت</li>
          <li>۳) خرید پکیج نقره‌ای یا طلایی</li>
          <li>۴) تأیید ادمین → نمایش در چت</li>
        </ol>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
        {token ? (
          <>
            <span className="text-emerald-300">وارد شده‌اید</span>
            <button
              type="button"
              className="text-orange-300"
              onClick={() => {
                clearWebToken();
                setToken(null);
                setList([]);
              }}
            >
              خروج
            </button>
          </>
        ) : (
          <button type="button" className="text-orange-300" onClick={() => setShowLogin(true)}>
            ورود با موبایل برای ثبت تعمیرگاه
          </button>
        )}
      </div>

      {error ? <p className="mb-4 text-sm text-red-300">{error}</p> : null}
      {okMsg ? <p className="mb-4 text-sm text-emerald-300">{okMsg}</p> : null}

      <form
        onSubmit={onRegister}
        className="mb-10 space-y-3 rounded-2xl border border-white/10 bg-[#1A120E] p-5"
      >
        <h2 className="text-lg font-bold text-amber-100">فرم ثبت</h2>
        <label className="block text-sm">
          نام تعمیرگاه *
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            شهر
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            تلفن
            <input
              dir="ltr"
              value={gPhone}
              onChange={(e) => setGPhone(e.target.value)}
              placeholder="همان موبایل حساب اگر خالی باشد"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2"
            />
          </label>
        </div>
        <label className="block text-sm">
          آدرس
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <label className="block text-sm">
            عرض جغرافیایی (lat) *
            <input
              required
              dir="ltr"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            طول جغرافیایی (lng) *
            <input
              required
              dir="ltr"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2"
            />
          </label>
          <button
            type="button"
            onClick={useMyLocation}
            disabled={geoLoading}
            className="self-end rounded-xl bg-white/10 px-3 py-2 text-sm disabled:opacity-50"
          >
            {geoLoading ? '…' : 'موقعیت من'}
          </button>
        </div>
        <label className="block text-sm">
          تخصص‌ها (با ویرگول)
          <input
            value={specialties}
            onChange={(e) => setSpecialties(e.target.value)}
            placeholder="موتور، برق، جلوبندی"
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          توضیحات
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-orange-500 py-3 font-bold text-white disabled:opacity-60"
        >
          {loading ? 'در حال ثبت…' : 'ثبت تعمیرگاه'}
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-amber-100">تعمیرگاه‌های من و پکیج معرفی</h2>
        {list.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 p-6 text-sm text-amber-100/50">
            هنوز تعمیرگاهی ثبت نکرده‌اید.
          </p>
        ) : (
          list.map((g) => (
            <article key={g.id} className="rounded-2xl border border-white/10 bg-[#1A120E] p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-amber-50">{g.name}</h3>
                  <p className="text-sm text-amber-100/60">
                    {[g.city, g.address].filter(Boolean).join(' · ') || '—'}
                  </p>
                  <p className="mt-1 text-xs text-amber-100/45" dir="ltr">
                    {g.lat}, {g.lng}
                  </p>
                </div>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-amber-100/80">
                  {STATUS_FA[g.chatStatus || 'none'] || g.chatStatus}
                </span>
              </div>
              {g.chatStatus !== 'approved' ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={!!buyingId}
                    onClick={() => void buyPromo('garage_silver_30', g.id)}
                    className="rounded-xl border border-white/15 bg-white/5 py-2.5 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
                  >
                    {buyingId === `garage_silver_30-${g.id}`
                      ? 'انتقال…'
                      : 'پکیج نقره‌ای ۳۰ روز — ۲۹۹٬۰۰۰ ت'}
                  </button>
                  <button
                    type="button"
                    disabled={!!buyingId}
                    onClick={() => void buyPromo('garage_gold_30', g.id)}
                    className="rounded-xl border border-orange-400/40 bg-orange-500/20 py-2.5 text-sm font-semibold text-orange-100 hover:bg-orange-500/30 disabled:opacity-50"
                  >
                    {buyingId === `garage_gold_30-${g.id}`
                      ? 'انتقال…'
                      : 'پکیج طلایی ۳۰ روز — ۵۹۹٬۰۰۰ ت'}
                  </button>
                </div>
              ) : (
                <p className="mt-3 text-sm text-emerald-300/90">
                  این تعمیرگاه در معرفی چت فعال است
                  {g.subscriptionTier ? ` (${g.subscriptionTier})` : ''}.
                </p>
              )}
            </article>
          ))
        )}
      </section>

      {showLogin ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#1A120E] p-5">
            <h2 className="text-xl font-bold">ورود</h2>
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
                  ورود
                </button>
              )}
              <button type="button" onClick={() => setShowLogin(false)} className="rounded-xl bg-white/10 px-4">
                بعداً
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
