'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { api, clearWebToken, readToken, saveWebToken } from '@/lib/web-auth';
import { DiagnoseResultView } from './diagnose-result-view';

type Profile = {
  phone?: string;
  credits?: number;
  isGolden?: boolean;
  name?: string;
};

type Car = {
  id: string;
  name: string;
  brand?: string;
  category?: string;
};

type CarsMeta = { total: number };

type HistoryItem = {
  id: string;
  carName?: string;
  year?: string;
  description?: string;
  result?: string;
  createdAt?: string;
};

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

  const [loading, setLoading] = useState(false);
  const [loadingTip, setLoadingTip] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [structured, setStructured] = useState<unknown>(null);
  const [followUp, setFollowUp] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const loadCars = useCallback(
    async (q: string, opts: { offset: number; append: boolean }) => {
      setCarsLoading(true);
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set('q', q.trim());
        if (categoryFilter) params.set('category', categoryFilter);
        params.set('limit', '40');
        params.set('offset', String(opts.offset));
        const { ok, body } = await api<{ data?: Car[]; meta?: CarsMeta }>(`/api/cars?${params}`);
        if (ok) {
          const list = Array.isArray(body.data) ? body.data : [];
          setCars((prev) => (opts.append ? [...prev, ...list] : list));
          setCarsMeta(body.meta ?? { total: list.length });
          setCarsOffset(opts.offset + list.length);
        }
      } finally {
        setCarsLoading(false);
      }
    },
    [categoryFilter],
  );

  const loadProfile = useCallback(async (t: string) => {
    const { ok, body } = await api<{ data?: Profile }>('/api/account', { token: t });
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
    if (!loading) return;
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

  function selectCar(car: Car) {
    setCarId(car.id);
    setCarLabel(car.name);
    setCustomName('');
    setCarMenuOpen(false);
  }

  async function sendOtp() {
    setError('');
    setLoading(true);
    try {
      const { ok, body } = await api<{ otp?: string; error?: string }>(
        '/api/account',
        { method: 'POST', body: { phone, action: 'otp' } },
      );
      if (!ok) throw new Error(body.error || 'ارسال کد ناموفق بود');
      setOtpSent(true);
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
      const { ok, body } = await api<{ token?: string; error?: string }>('/api/account', {
        method: 'POST',
        body: { phone, otp, action: 'verify' },
      });
      if (!ok || !body.token) throw new Error(body.error || 'کد نادرست است');
      persistToken(body.token);
      setShowLogin(false);
      setOtp('');
      setOtpSent(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا');
    } finally {
      setLoading(false);
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setError('دسترسی به میکروفون ممکن نشد');
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  async function runDiagnose(followUpText?: string) {
    if (!token) {
      setShowLogin(true);
      setError('برای عیب‌یابی باید وارد شوید.');
      return;
    }
    const problem = followUpText ?? description;
    setError('');
    setLoadingTip(0);
    setLoading(true);
    try {
      if (mode === 'audio' && audioBlob && !followUpText) {
        const fd = new FormData();
        fd.append('carId', carId || 'custom');
        fd.append('year', year);
        if (customName) fd.append('carName', customName);
        fd.append('audio', audioBlob, 'voice.webm');
        const res = await fetch('/api/diagnose', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'خطا در عیب‌یابی');
        setResult(body.data?.text ?? body.result ?? JSON.stringify(body));
        setStructured(body.data?.structured ?? null);
      } else {
        const { ok, body } = await api<{
          data?: { text?: string; structured?: unknown };
          result?: string;
          error?: string;
        }>('/api/diagnose', {
          method: 'POST',
          token,
          body: {
            carId: carId || 'custom',
            year,
            description: problem,
            carName: customName || undefined,
          },
        });
        if (!ok) {
          if ((body as { status?: number }).status === 402 || body.error?.includes('اعتبار')) {
            window.location.href = '/buy';
            return;
          }
          throw new Error(body.error || 'خطا در عیب‌یابی');
        }
        setResult(body.data?.text ?? body.result ?? '');
        setStructured(body.data?.structured ?? null);
      }
      if (token) {
        void loadProfile(token);
        void loadHistory(token);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا');
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void runDiagnose();
  }

  const filteredCars = useMemo(() => cars, [cars]);

  return (
    <div className="relative mx-auto min-h-screen max-w-3xl px-4 py-8 text-amber-50">
      {loading && !showLogin ? <DiagnoseLoadingOverlay tip={LOADING_TIPS[loadingTip]} /> : null}

      <header className="mb-8 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-orange-400">عیب‌یابی هوشمند</h1>
          <p className="text-sm text-amber-100/60">شرح مشکل را بنویسید یا با صدا بگویید</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {token ? (
            <>
              <span className="rounded-full bg-orange-500/15 px-3 py-1 text-orange-300">
                {profile?.isGolden ? 'طلایی' : `اعتبار: ${profile?.credits ?? '—'}`}
              </span>
              <button type="button" onClick={logout} className="text-amber-100/50 hover:text-amber-100">
                خروج
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowLogin(true)}
              className="rounded-full bg-orange-500 px-4 py-1.5 font-bold text-black"
            >
              ورود
            </button>
          )}
        </div>
      </header>

      {showLogin && (
        <div className="mb-6 rounded-2xl border border-orange-400/20 bg-[#1A120E] p-5">
          <h2 className="mb-3 font-bold">ورود با موبایل</h2>
          <input
            className="mb-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2"
            placeholder="۰۹۱۲..."
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          {otpSent && (
            <input
              className="mb-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2"
              placeholder="کد تأیید"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          )}
          <div className="flex gap-2">
            {!otpSent ? (
              <button type="button" disabled={loading} onClick={() => void sendOtp()} className="rounded-xl bg-orange-500 px-4 py-2 font-bold text-black">
                ارسال کد
              </button>
            ) : (
              <button type="button" disabled={loading} onClick={() => void verifyOtp()} className="rounded-xl bg-orange-500 px-4 py-2 font-bold text-black">
                تأیید
              </button>
            )}
            <button type="button" onClick={() => setShowLogin(false)} className="text-amber-100/50">
              بستن
            </button>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-orange-400/15 bg-[#1A120E]/70 p-5">
        <div>
          <label className="mb-1 block text-xs text-amber-100/50">خودرو</label>
          <button
            type="button"
            onClick={() => setCarMenuOpen((v) => !v)}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-right"
          >
            {carLabel || customName || 'انتخاب خودرو'}
          </button>
          {carMenuOpen && (
            <div className="mt-2 max-h-64 overflow-auto rounded-xl border border-white/10 bg-black/50 p-2">
              <input
                className="mb-2 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm"
                placeholder="جستجو..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {filteredCars.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectCar(c)}
                  className="block w-full rounded-lg px-2 py-1.5 text-right text-sm hover:bg-orange-500/10"
                >
                  {c.name}
                </button>
              ))}
              {carsLoading && <p className="p-2 text-xs text-amber-100/40">در حال بارگذاری…</p>}
              <div className="mt-2 border-t border-white/10 pt-2">
                <input
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm"
                  placeholder="نام خودروی سفارشی"
                  value={customName}
                  onChange={(e) => {
                    setCustomName(e.target.value);
                    setCarId('custom');
                    setCarLabel('');
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs text-amber-100/50">سال ساخت</label>
          <input
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="مثلاً ۱۴۰۱ یا ۲۰۱۸"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode('text')}
            className={`rounded-full px-3 py-1 text-sm ${mode === 'text' ? 'bg-orange-500 text-black' : 'bg-white/5'}`}
          >
            متن
          </button>
          <button
            type="button"
            onClick={() => setMode('audio')}
            className={`rounded-full px-3 py-1 text-sm ${mode === 'audio' ? 'bg-orange-500 text-black' : 'bg-white/5'}`}
          >
            صدا
          </button>
        </div>

        {mode === 'text' ? (
          <textarea
            className="min-h-[120px] w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2"
            placeholder="علائم و مشکل را شرح دهید…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        ) : (
          <div className="flex items-center gap-3">
            {!recording ? (
              <button type="button" onClick={() => void startRecording()} className="rounded-xl bg-orange-500 px-4 py-2 font-bold text-black">
                شروع ضبط
              </button>
            ) : (
              <button type="button" onClick={stopRecording} className="rounded-xl bg-red-500 px-4 py-2 font-bold text-white">
                توقف
              </button>
            )}
            {audioBlob && <span className="text-xs text-amber-100/50">صدا آماده است</span>}
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}
        {loading ? (
          <p className="text-center text-xs text-amber-200/70 animate-pulse">{LOADING_TIPS[loadingTip]}</p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-gradient-to-l from-orange-500 to-amber-500 py-3 font-black text-black disabled:opacity-50"
        >
          {loading ? 'در حال عیب‌یابی…' : 'شروع عیب‌یابی'}
        </button>
      </form>

      {result && (
        <div className="mt-6 space-y-4">
          <DiagnoseResultView text={result} structured={structured} />
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <p className="mb-2 text-sm text-amber-100/60">سؤال پیگیری</p>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2"
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                placeholder="مثلاً اگر روغن کم باشد چه؟"
              />
              <button
                type="button"
                disabled={loading || !followUp.trim()}
                onClick={() => void runDiagnose(followUp.trim())}
                className="rounded-xl bg-orange-500 px-4 py-2 font-bold text-black disabled:opacity-50"
              >
                بپرس
              </button>
            </div>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-bold text-amber-100/70">تاریخچه اخیر</h3>
          <ul className="space-y-2">
            {history.map((h) => (
              <li key={h.id} className="rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-sm text-amber-100/70">
                <span className="text-orange-300">{h.carName || 'خودرو'}</span>
                {h.year ? ` · ${h.year}` : ''}
                {h.description ? ` — ${h.description.slice(0, 80)}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
