'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { markdownToHtml } from '@/lib/markdown';

const TOKEN_KEY = 'smartmec_web_token';

type Car = {
  id: string | number;
  brand: string;
  model: string;
  engine?: string;
};

type Profile = {
  phone: string;
  credits: number;
  isGolden: boolean;
  remainingFree: number | null;
  monthlyFreeLimit: number;
};

type HistoryItem = {
  id: number;
  carId: string;
  description: string;
  result: string;
  createdAt: string;
};

type Product = {
  id: string;
  name: string;
  price: number;
  credits?: number;
  goldenDays?: number;
  popular?: boolean;
};

type DiagnoseResult = {
  text: string;
  diagnosticId?: number;
  remainingCredits?: number | null;
  remainingFreeQuestions?: number | null;
};

async function api<T>(
  path: string,
  options: {
    method?: string;
    token?: string | null;
    json?: unknown;
    form?: FormData;
  } = {}
): Promise<{ ok: boolean; status: number; body: T & { success?: boolean; error?: string } }> {
  const headers: HeadersInit = {};
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.json !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(path, {
    method: options.method || 'GET',
    headers,
    body: options.form ?? (options.json !== undefined ? JSON.stringify(options.json) : undefined),
  });
  const body = (await res.json().catch(() => ({}))) as T & { success?: boolean; error?: string };
  return { ok: res.ok && body.success !== false, status: res.status, body };
}

function formatToman(n: number) {
  return `${n.toLocaleString('fa-IR')} تومان`;
}

export function DiagnoseApp() {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cars, setCars] = useState<Car[]>([]);
  const [query, setQuery] = useState('');
  const [carId, setCarId] = useState('');
  const [carLabel, setCarLabel] = useState('');
  const [customName, setCustomName] = useState('');
  const [year, setYear] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<'text' | 'audio'>('text');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const pendingSubmit = useRef(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<DiagnoseResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [followUp, setFollowUp] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [needCredits, setNeedCredits] = useState(false);

  const selectedCustom = carId === 'custom';

  const filteredCars = useMemo(() => {
    const q = query.trim();
    if (!q) return cars.slice(0, 8);
    return cars.slice(0, 12);
  }, [cars, query]);

  const loadCars = useCallback(async (q: string) => {
    const { body } = await api<{ data?: Car[] }>(`/api/cars?q=${encodeURIComponent(q)}`);
    setCars(Array.isArray(body.data) ? body.data : []);
  }, []);

  const loadProfile = useCallback(async (t: string) => {
    const { ok, status, body } = await api<{ data?: Profile }>('/api/account/credits', { token: t });
    if (status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setProfile(null);
      return false;
    }
    if (ok && body.data) setProfile(body.data);
    return ok;
  }, []);

  const loadHistory = useCallback(async (t: string) => {
    const { ok, body } = await api<{ data?: HistoryItem[] }>('/api/diagnose?limit=8', { token: t });
    if (ok && Array.isArray(body.data)) setHistory(body.data);
  }, []);

  useEffect(() => {
    if (!token) return;
    const handle = window.setTimeout(() => {
      void loadProfile(token);
      void loadHistory(token);
    }, 0);
    return () => window.clearTimeout(handle);
  }, [token, loadProfile, loadHistory]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadCars(query);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [query, loadCars]);

  function persistToken(next: string) {
    localStorage.setItem(TOKEN_KEY, next);
    setToken(next);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setProfile(null);
    setHistory([]);
  }

  function pickCar(car: Car) {
    setCarId(String(car.id));
    setCarLabel(`${car.brand} ${car.model}`);
    setQuery(`${car.brand} ${car.model}`);
  }

  async function sendOtp() {
    setError('');
    setLoading(true);
    try {
      const { ok, body } = await api<{ otp?: string; error?: string; message?: string }>(
        '/api/account',
        { method: 'POST', json: { action: 'send', phone } }
      );
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
      const { ok, body } = await api<{ token?: string; error?: string }>('/api/account', {
        method: 'POST',
        json: { action: 'verify', phone, code: otp },
      });
      if (!ok || !body.token) throw new Error(body.error || 'ورود ناموفق بود');
      persistToken(body.token);
      setShowLogin(false);
      setOtp('');
      setOtpSent(false);
      if (pendingSubmit.current) {
        pendingSubmit.current = false;
        await runDiagnose(body.token);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در ورود');
    } finally {
      setLoading(false);
    }
  }

  function validateForm(): string | null {
    if (!carId) return 'خودرو را از لیست انتخاب کن یا گزینهٔ خارج از لیست را بزن.';
    if (selectedCustom && customName.trim().length < 2) return 'نام خودرو را بنویس.';
    if (!year.trim()) return 'سال ساخت را وارد کن.';
    if (mode === 'text' && description.trim().length < 10) {
      return 'شرح مشکل باید حداقل ۱۰ کاراکتر باشد.';
    }
    if (mode === 'audio' && !audioBlob) return 'اول صدای موتور را ضبط یا آپلود کن.';
    return null;
  }

  async function startRecording() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      setError('دسترسی به میکروفون داده نشد. می‌توانی فایل صوتی آپلود کنی.');
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  async function runDiagnose(authToken: string, followUpText?: string) {
    const problem = followUpText ?? description;
    setError('');
    setNeedCredits(false);
    setLoading(true);
    try {
      if (mode === 'audio' && audioBlob && !followUpText) {
        const form = new FormData();
        form.set('carId', carId);
        form.set('year', year);
        if (selectedCustom) form.set('carName', customName);
        if (description.trim()) form.set('description', description.trim());
        form.set('audio', audioBlob, 'engine-sound.webm');
        const { ok, status, body } = await api<{
          data?: { result?: string };
          diagnosticId?: number;
          remainingCredits?: number | null;
          remainingFreeQuestions?: number | null;
          error?: string;
        }>('/api/diagnose/audio', { method: 'POST', token: authToken, form });
        if (status === 401) {
          pendingSubmit.current = true;
          setShowLogin(true);
          logout();
          return;
        }
        if (status === 402) {
          setNeedCredits(true);
          await loadProducts();
          throw new Error(body.error || 'اعتبار کافی نیست');
        }
        if (!ok || !body.data?.result) throw new Error(body.error || 'عیب‌یابی ناموفق بود');
        setResult({
          text: body.data.result,
          diagnosticId: body.diagnosticId,
          remainingCredits: body.remainingCredits,
          remainingFreeQuestions: body.remainingFreeQuestions,
        });
      } else {
        const { ok, status, body } = await api<{
          data?: { result?: string };
          diagnosticId?: number;
          remainingCredits?: number | null;
          remainingFreeQuestions?: number | null;
          error?: string;
        }>('/api/diagnose', {
          method: 'POST',
          token: authToken,
          json: {
            carId,
            year,
            description: problem,
            carName: selectedCustom ? customName : undefined,
            previousDiagnosticId: followUpText ? result?.diagnosticId : undefined,
          },
        });
        if (status === 401) {
          pendingSubmit.current = true;
          setShowLogin(true);
          logout();
          return;
        }
        if (status === 402) {
          setNeedCredits(true);
          await loadProducts();
          throw new Error(body.error || 'اعتبار کافی نیست');
        }
        if (!ok || !body.data?.result) throw new Error(body.error || 'عیب‌یابی ناموفق بود');
        setResult({
          text: body.data.result,
          diagnosticId: body.diagnosticId,
          remainingCredits: body.remainingCredits,
          remainingFreeQuestions: body.remainingFreeQuestions,
        });
        if (followUpText) setFollowUp('');
      }
      await loadProfile(authToken);
      await loadHistory(authToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در عیب‌یابی');
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const invalid = validateForm();
    if (invalid) {
      setError(invalid);
      return;
    }
    if (!token) {
      pendingSubmit.current = true;
      setShowLogin(true);
      return;
    }
    await runDiagnose(token);
  }

  async function loadProducts() {
    const { body } = await api<{ data?: Product[] }>('/api/products');
    setProducts(Array.isArray(body.data) ? body.data : []);
  }

  async function buy(productId: string) {
    if (!token) {
      setShowLogin(true);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { ok, body } = await api<{ paymentUrl?: string; error?: string }>('/api/purchase', {
        method: 'POST',
        token,
        json: { productId, from: 'web' },
      });
      if (!ok || !body.paymentUrl) throw new Error(body.error || 'ساخت تراکنش ناموفق بود');
      window.location.href = body.paymentUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در پرداخت');
      setLoading(false);
    }
  }

  async function openHistory(item: HistoryItem) {
    setResult({ text: item.result, diagnosticId: item.id });
    setDescription(item.description);
  }

  const resultHtml = result ? markdownToHtml(result.text) : '';

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-amber-200/70">نسخه وب</p>
          <h1 className="text-3xl font-extrabold md:text-4xl">عیب‌یابی هوشمند خودرو</h1>
          <p className="mt-2 max-w-xl text-amber-100/75">
            ماشین و سال ساخت را بگو، مشکل را شرح بده یا صدای موتور را بفرست. همان هوش مصنوعی اپ روی وب جواب می‌دهد.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
          {profile ? (
            <div className="flex flex-wrap items-center gap-3">
              <span dir="ltr">{profile.phone}</span>
              {profile.isGolden ? (
                <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-amber-200">طلایی</span>
              ) : (
                <>
                  <span>اعتبار: {profile.credits.toLocaleString('fa-IR')}</span>
                  <span>سهمیه رایگان: {profile.remainingFree ?? 0}</span>
                </>
              )}
              <button type="button" onClick={logout} className="text-orange-300 hover:text-orange-200">
                خروج
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setShowLogin(true)} className="text-orange-300">
              ورود با شماره موبایل
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-[#1A120E] p-5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('text')}
              className={`rounded-full px-4 py-2 text-sm ${mode === 'text' ? 'bg-orange-500 text-white' : 'bg-white/5'}`}
            >
              شرح مشکل
            </button>
            <button
              type="button"
              onClick={() => setMode('audio')}
              className={`rounded-full px-4 py-2 text-sm ${mode === 'audio' ? 'bg-orange-500 text-white' : 'bg-white/5'}`}
            >
              صدای موتور
            </button>
          </div>

          <label className="block text-sm">
            خودرو
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (carId && e.target.value !== carLabel) setCarId('');
              }}
              placeholder="مثلاً پژو ۲۰۶ یا پراید"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-orange-400"
            />
          </label>

          <div className="max-h-40 overflow-auto rounded-xl border border-white/10">
            {filteredCars.map((car) => (
              <button
                type="button"
                key={String(car.id)}
                onClick={() => pickCar(car)}
                className={`block w-full px-3 py-2 text-right text-sm hover:bg-white/5 ${
                  carId === String(car.id) ? 'bg-orange-500/15 text-orange-100' : 'text-amber-100/80'
                }`}
              >
                {car.brand} {car.model}
                {car.engine ? <span className="text-amber-100/40"> · {car.engine}</span> : null}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setCarId('custom');
                setCarLabel('خودروی خارج از لیست');
                setQuery('خودروی خارج از لیست');
              }}
              className="block w-full px-3 py-2 text-right text-sm text-orange-300 hover:bg-white/5"
            >
              خودروی من در لیست نیست
            </button>
          </div>

          {selectedCustom ? (
            <label className="block text-sm">
              نام خودرو
              <input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-orange-400"
              />
            </label>
          ) : null}

          <label className="block text-sm">
            سال ساخت (شمسی یا میلادی)
            <input
              value={year}
              onChange={(e) => setYear(e.target.value)}
              inputMode="numeric"
              placeholder="مثلاً ۱۳۹۸"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-orange-400"
            />
          </label>

          <label className="block text-sm">
            {mode === 'audio' ? 'توضیح کوتاه (اختیاری)' : 'شرح مشکل'}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="مثلاً صبح‌ها صدای تق‌تق از موتور می‌آید و ماشین سخت روشن می‌شود."
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-orange-400"
            />
          </label>

          {mode === 'audio' ? (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {recording ? (
                <button type="button" onClick={stopRecording} className="rounded-full bg-red-600 px-4 py-2">
                  توقف ضبط
                </button>
              ) : (
                <button type="button" onClick={startRecording} className="rounded-full bg-white/10 px-4 py-2">
                  ضبط صدا
                </button>
              )}
              <label className="cursor-pointer rounded-full bg-white/10 px-4 py-2">
                آپلود فایل
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setAudioBlob(file);
                  }}
                />
              </label>
              {audioBlob ? (
                <span className="text-emerald-300">
                  فایل آماده ({Math.round(audioBlob.size / 1024)} کیلوبایت)
                </span>
              ) : null}
            </div>
          ) : null}

          {error ? <p className="text-sm text-red-300">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-orange-500 py-3 font-bold text-white hover:bg-orange-400 disabled:opacity-60"
          >
            {loading ? 'در حال عیب‌یابی…' : 'عیب‌یابی کن'}
          </button>
        </form>

        <div className="space-y-4">
          {result ? (
            <article className="rounded-2xl border border-orange-400/30 bg-[#1A120E] p-5">
              <h2 className="mb-4 text-xl font-bold text-amber-100">نتیجه</h2>
              <div
                className="diagnose-result text-sm leading-8 text-amber-50/90"
                dangerouslySetInnerHTML={{ __html: resultHtml }}
              />
              {result.diagnosticId ? (
                <form
                  className="mt-6 border-t border-white/10 pt-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!token) {
                      setShowLogin(true);
                      return;
                    }
                    if (followUp.trim().length < 10) {
                      setError('سوال پیگیری باید حداقل ۱۰ کاراکتر باشد.');
                      return;
                    }
                    void runDiagnose(token, followUp.trim());
                  }}
                >
                  <label className="block text-sm">
                    سوال بعدی درباره همین مشکل
                    <textarea
                      value={followUp}
                      onChange={(e) => setFollowUp(e.target.value)}
                      rows={3}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-orange-400"
                    />
                  </label>
                  <button type="submit" className="mt-3 rounded-xl bg-white/10 px-4 py-2 text-sm">
                    بپرس
                  </button>
                </form>
              ) : null}
            </article>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/15 p-8 text-amber-100/60">
              نتیجه عیب‌یابی این‌جا می‌آید. این تحلیل جای مکانیک متخصص را نمی‌گیرد.
            </div>
          )}

          {needCredits ? (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-5">
              <h3 className="font-bold text-amber-200">اعتبار تمام شده</h3>
              <p className="mt-2 text-sm text-amber-100/70">یک بسته بخر تا همان‌جا ادامه بدهی.</p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {products.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => void buy(p.id)}
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-right text-sm hover:border-orange-400/50"
                    >
                      <span className="block font-semibold">{p.name}</span>
                      <span className="text-orange-300">{formatToman(p.price)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {history.length > 0 ? (
            <div>
              <h3 className="mb-2 font-semibold text-amber-100">تاریخچه</h3>
              <ul className="space-y-2">
                {history.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => openHistory(item)}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-right text-sm text-amber-100/80 hover:border-orange-400/40"
                    >
                      <span className="line-clamp-1">{item.description}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      {showLogin ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#1A120E] p-5">
            <h2 className="text-xl font-bold">ورود با شماره موبایل</h2>
            <p className="mt-2 text-sm text-amber-100/70">همان حساب اپ؛ کد یک‌بارمصرف پیامک می‌شود.</p>
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
