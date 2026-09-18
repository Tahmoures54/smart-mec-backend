'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { DiagnoseResultView } from './diagnose-result-view';
import { clearWebToken, getTokenKey, readWebToken, saveWebToken } from '@/lib/web-auth';
import type { StructuredDiagnose } from '@/types';

const TOKEN_KEY = getTokenKey();

function readToken(): string | null {
  return readWebToken();
}

type Car = {
  id: string | number;
  brand: string;
  model: string;
  engine?: string;
  category?: string;
  region?: string;
  isPopular?: boolean;
};

type CarCategoryMeta = { id: string; label: string; count: number };

type CarsMeta = {
  total: number;
  catalogTotal?: number;
  brandCount?: number;
  hasMore?: boolean;
  categories?: CarCategoryMeta[];
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

type DiagnoseResult = {
  text: string;
  structured?: StructuredDiagnose | null;
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

/** Overlay لودینگ عیب‌یابی — کاربر فکر نکند صفحه هنگ کرده */
function DiagnoseLoadingOverlay({ tip }: { tip: string }) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="w-full max-w-sm rounded-3xl border border-orange-400/30 bg-[#1A120E] p-8 text-center shadow-[0_0_48px_rgba(255,122,26,0.2)]">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-orange-500/25 border-t-orange-400" />
        </div>
        <p className="text-lg font-bold text-amber-50">در حال عیب‌یابی…</p>
        <p className="mt-2 min-h-[3rem] text-sm leading-7 text-amber-100/70">{tip}</p>
        <p className="mt-4 text-[11px] text-amber-100/40">
          معمولاً ۱۰ تا ۴۰ ثانیه طول می‌کشد — لطفاً صفحه را نبندید
        </p>
      </div>
    </div>
  );
}

const LOADING_TIPS = [
  'در حال بررسی علائم و شرح مشکل…',
  'مقایسه با الگوهای خرابی مشابه…',
  'تحلیل احتمال قطعات معیوب…',
  'آماده‌سازی راهنمای گام‌به‌گام…',
] as const;

export function DiagnoseApp() {
  const [token, setToken] = useState<string | null>(() => readToken());
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cars, setCars] = useState<Car[]>([]);
  const [carsMeta, setCarsMeta] = useState<CarsMeta>({ total: 0 });
  const [categoryFilter, setCategoryFilter] = useState('');
  const [carsOffset, setCarsOffset] = useState(0);
  const [carsLoading, setCarsLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [carMenuOpen, setCarMenuOpen] = useState(false);
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
  const [loadingTip, setLoadingTip] = useState(0);

  const selectedCustom = carId === 'custom';

  const carsByBrand = useMemo(() => {
    const map = new Map<string, Car[]>();
    for (const car of cars) {
      const list = map.get(car.brand) || [];
      list.push(car);
      map.set(car.brand, list);
    }
    return Array.from(map.entries());
  }, [cars]);

  const loadCars = useCallback(
    async (q: string, opts?: { offset?: number; append?: boolean; category?: string }) => {
      const offset = opts?.offset ?? 0;
      const category = opts?.category ?? categoryFilter;
      setCarsLoading(true);
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set('q', q.trim());
        if (category) params.set('category', category);
        params.set('limit', '60');
        params.set('offset', String(offset));
        const { body } = await api<{
          data?: Car[];
          meta?: CarsMeta & { hasMore?: boolean };
        }>(`/api/cars?${params.toString()}`);
        const list = Array.isArray(body.data) ? body.data : [];
        setCars((prev) => (opts?.append ? [...prev, ...list] : list));
        if (body.meta) {
          setCarsMeta({
            total: body.meta.total ?? list.length,
            catalogTotal: body.meta.catalogTotal,
            brandCount: body.meta.brandCount,
            hasMore: body.meta.hasMore,
            categories: body.meta.categories,
          });
        }
        setCarsOffset(offset + list.length);
      } finally {
        setCarsLoading(false);
      }
    },
    [categoryFilter]
  );

  const loadProfile = useCallback(async (t: string) => {
    const { ok, status, body } = await api<{ data?: Profile }>('/api/account/credits', { token: t });
    if (status === 401) {
      clearWebToken();
      setToken(null);
      setProfile(null);
      setHistory([]);
      setError('نشست شما منقضی شده است. لطفاً دوباره وارد شوید.');
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
    if (!loading) {
      setLoadingTip(0);
      return;
    }
    const id = window.setInterval(() => {
      setLoadingTip((i) => (i + 1) % LOADING_TIPS.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, [loading]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadCars(query, { offset: 0, append: false });
    }, 280);
    return () => window.clearTimeout(handle);
  }, [query, categoryFilter, loadCars]);

  function persistToken(next: string) {
    saveWebToken(next);
    setToken(next);
  }

  function logout() {
    clearWebToken();
    setToken(null);
    setProfile(null);
    setHistory([]);
    setResult(null);
    setFollowUp('');
  }

  function pickCar(car: Car) {
    setCarId(String(car.id));
    setCarLabel(`${car.brand} ${car.model}`);
    setQuery(`${car.brand} ${car.model}`);
    setCarMenuOpen(false);
  }

  async function sendOtp() {
    setError('');
    setLoading(true);
    try {
      const { ok, body } = await api<{ otp?: string; error?: string }>(
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
      const p = phone.replace(/\s/g, '');
      if (p === '09160684552') {
        try {
          localStorage.setItem('admin_token', body.token);
        } catch {
          /* ignore */
        }
      }
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
    if (!carId && query.trim().length >= 2) return null;
    if (!carId) return 'نام خودرو را بنویس یا از لیست انتخاب کن.';
    if (selectedCustom && customName.trim().length < 2 && query.trim().length < 2) {
      return 'نام خودرو را کامل‌تر بنویس.';
    }
    if (mode === 'text' && description.trim().length < 5) {
      return 'مشکل را کمی بیشتر شرح بده.';
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
    const t = (authToken || '').trim();
    if (!t || t.length < 10) {
      pendingSubmit.current = true;
      setShowLogin(true);
      setError('برای عیب‌یابی باید وارد شوید.');
      return;
    }
    const problem = followUpText ?? description;
    setError('');
    setLoading(true);
    try {
      if (mode === 'audio' && audioBlob && !followUpText) {
        const form = new FormData();
        let aCarId = carId;
        let aCarName = selectedCustom ? customName.trim() : '';
        if ((!aCarId || aCarId === 'custom') && (aCarName || query.trim().length >= 2)) {
          aCarId = 'custom';
          aCarName = aCarName || query.trim();
        }
        form.set('carId', aCarId || 'custom');
        form.set('year', year);
        if (aCarId === 'custom' && aCarName) form.set('carName', aCarName);
        if (description.trim()) form.set('description', description.trim());
        form.set('audio', audioBlob, 'engine-sound.webm');
        const { ok, status, body } = await api<{
          data?: { result?: string; structured?: StructuredDiagnose | null };
          diagnosticId?: number;
          remainingCredits?: number | null;
          remainingFreeQuestions?: number | null;
          error?: string;
        }>('/api/diagnose/audio', { method: 'POST', token: t, form });
        if (status === 401) {
          pendingSubmit.current = true;
          logout();
          setShowLogin(true);
          setError(body.error || 'نشست شما منقضی شده است. لطفاً دوباره وارد شوید.');
          return;
        }
        if (status === 402) {
          window.location.href = '/buy?reason=credits';
          return;
        }
        if (!ok || !body.data?.result) throw new Error(body.error || 'عیب‌یابی ناموفق بود');
        setResult({
          text: body.data.result,
          structured: body.data.structured ?? null,
          diagnosticId: body.diagnosticId,
          remainingCredits: body.remainingCredits,
          remainingFreeQuestions: body.remainingFreeQuestions,
        });
      } else {
        let sendCarId = carId;
        let sendCarName: string | undefined =
          carId === 'custom' || selectedCustom
            ? customName.trim() || query.trim() || undefined
            : undefined;
        if ((!sendCarId || sendCarId === 'custom') && (sendCarName || query.trim().length >= 2)) {
          sendCarId = 'custom';
          sendCarName = sendCarName || query.trim();
        }
        const { ok, status, body } = await api<{
          data?: { result?: string; structured?: StructuredDiagnose | null };
          diagnosticId?: number;
          remainingCredits?: number | null;
          remainingFreeQuestions?: number | null;
          error?: string;
        }>('/api/diagnose', {
          method: 'POST',
          token: t,
          json: {
            carId: sendCarId,
            year,
            description: problem,
            carName: sendCarName,
            previousDiagnosticId: followUpText ? result?.diagnosticId : undefined,
          },
        });
        if (status === 401) {
          pendingSubmit.current = true;
          logout();
          setShowLogin(true);
          setError(body.error || 'نشست شما منقضی شده است. لطفاً دوباره وارد شوید.');
          return;
        }
        if (status === 402) {
          window.location.href = '/buy?reason=credits';
          return;
        }
        if (!ok || !body.data?.result) throw new Error(body.error || 'عیب‌یابی ناموفق بود');
        setResult({
          text: body.data.result,
          structured: body.data.structured ?? null,
          diagnosticId: body.diagnosticId,
          remainingCredits: body.remainingCredits,
          remainingFreeQuestions: body.remainingFreeQuestions,
        });
        if (followUpText) setFollowUp('');
      }
      await loadProfile(t);
      await loadHistory(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در عیب‌یابی');
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!carId && query.trim().length >= 2) {
      setCarId('custom');
      setCustomName(query.trim());
      setCarLabel(query.trim());
    }
    const invalid = validateForm();
    if (invalid) {
      setError(invalid);
      return;
    }
    const auth = (token || readToken() || '').trim();
    if (!auth || auth.length < 10) {
      pendingSubmit.current = true;
      setShowLogin(true);
      setError('لطفاً ابتدا با شماره موبایل وارد شوید.');
      return;
    }
    await runDiagnose(auth);
  }

  function openHistory(item: HistoryItem) {
    setResult({ text: item.result, diagnosticId: item.id });
    setDescription(item.description);
  }

  // NOTE: UI کامل از commit قبلی بازیابی شود اگر این placeholder باقی ماند.
  // برای جلوگیری از قطع سرویس، حداقل اسکلت + overlay لودینگ را نگه می‌داریم.
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {loading && !showLogin ? <DiagnoseLoadingOverlay tip={LOADING_TIPS[loadingTip]} /> : null}
      <div className="mb-8">
        <p className="text-sm text-amber-200/70">نسخه وب</p>
        <h1 className="text-3xl font-extrabold md:text-4xl">عیب‌یابی هوشمند خودرو</h1>
        <p className="mt-2 max-w-xl text-amber-100/75">
          ماشین و سال ساخت را بگو، مشکل را شرح بده یا صدای موتور را بفرست.
        </p>
      </div>
      {error ? <p className="mb-4 text-sm text-red-300">{error}</p> : null}
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-[#1A120E] p-5">
        <div className="flex gap-2">
          <button type="button" onClick={() => setMode('text')} className={`rounded-full px-4 py-2 text-sm ${mode === 'text' ? 'bg-orange-500 text-white' : 'bg-white/5'}`}>شرح مشکل</button>
          <button type="button" onClick={() => setMode('audio')} className={`rounded-full px-4 py-2 text-sm ${mode === 'audio' ? 'bg-orange-500 text-white' : 'bg-white/5'}`}>صدای موتور</button>
        </div>
        <div>
          <label className="text-sm font-medium">خودرو</label>
          <input value={query} onChange={(e) => { setQuery(e.target.value); setCarMenuOpen(true); if (carId && e.target.value !== carLabel) setCarId(''); }} onFocus={() => setCarMenuOpen(true)} placeholder="مثلاً پژو ۲۰۶ یا دنا" className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-orange-400" />
          {carMenuOpen && cars.length > 0 ? (
            <div className="mt-1 max-h-48 overflow-auto rounded-xl border border-white/10 bg-[#1A120E]">
              {cars.slice(0, 30).map((car) => (
                <button key={String(car.id)} type="button" onClick={() => pickCar(car)} className="block w-full px-3 py-2 text-right text-sm hover:bg-white/5">
                  {car.brand} {car.model}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div>
          <label className="text-sm font-medium">سال ساخت</label>
          <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="مثلاً ۱۳۹۸" className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2" />
        </div>
        {mode === 'text' ? (
          <div>
            <label className="text-sm font-medium">شرح مشکل</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="مشکل را شرح بده…" className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2" />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              {!recording ? (
                <button type="button" onClick={() => void startRecording()} className="rounded-xl bg-white/10 px-4 py-2 text-sm">شروع ضبط</button>
              ) : (
                <button type="button" onClick={stopRecording} className="rounded-xl bg-red-500/80 px-4 py-2 text-sm">توقف</button>
              )}
              <label className="rounded-xl bg-white/10 px-4 py-2 text-sm cursor-pointer">
                آپلود فایل
                <input type="file" accept="audio/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setAudioBlob(f); }} />
              </label>
            </div>
            {audioBlob ? <p className="text-xs text-amber-200/70">فایل صوتی آماده است</p> : null}
          </div>
        )}
        <button type="submit" disabled={loading} className="w-full rounded-2xl bg-orange-500 py-3 font-bold text-white hover:bg-orange-400 disabled:opacity-60">
          {loading ? 'در حال عیب‌یابی…' : 'عیب‌یابی کن'}
        </button>
        {loading ? <p className="text-center text-xs text-amber-200/70 animate-pulse">{LOADING_TIPS[loadingTip]}</p> : null}
        <p className="text-center text-xs text-amber-100/45">اعتبار نداری؟ <a href="/buy" className="text-orange-300 hover:underline">شارژ حساب</a></p>
      </form>
      {result ? (
        <div className="mt-8">
          <DiagnoseResultView text={result.text} structured={result.structured} />
        </div>
      ) : null}
      {profile ? (
        <p className="mt-4 text-sm text-amber-100/60">
          {profile.phone} · اعتبار: {profile.credits.toLocaleString('fa-IR')}
          <button type="button" onClick={logout} className="mr-3 text-orange-300">خروج</button>
        </p>
      ) : (
        <button type="button" onClick={() => setShowLogin(true)} className="mt-4 text-orange-300">ورود با شماره موبایل</button>
      )}
      {showLogin ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#1A120E] p-5">
            <h2 className="text-xl font-bold">ورود</h2>
            <label className="mt-4 block text-sm">موبایل
              <input dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2" />
            </label>
            {otpSent ? (
              <label className="mt-3 block text-sm">کد
                <input dir="ltr" value={otp} onChange={(e) => setOtp(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2" />
              </label>
            ) : null}
            {devOtp ? <p className="mt-2 text-xs text-amber-300">کد توسعه: {devOtp}</p> : null}
            <div className="mt-4 flex gap-2">
              {!otpSent ? (
                <button type="button" disabled={loading} onClick={() => void sendOtp()} className="flex-1 rounded-xl bg-orange-500 py-2 font-semibold">ارسال کد</button>
              ) : (
                <button type="button" disabled={loading} onClick={() => void verifyOtp()} className="flex-1 rounded-xl bg-orange-500 py-2 font-semibold">ورود</button>
              )}
              <button type="button" onClick={() => setShowLogin(false)} className="rounded-xl bg-white/10 px-4">بعداً</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
