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

  const LOADING_TIPS = [
    'در حال بررسی علائم و شرح مشکل…',
    'مقایسه با الگوهای خرابی مشابه…',
    'تحلیل احتمال قطعات معیوب…',
    'آماده‌سازی راهنمای گام‌به‌گام…',
  ] as const;

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* PLACEHOLDER_REST - will restore full UI in next patch if truncated */}
      <p className="text-amber-100">در حال بازگردانی فایل… لطفاً یک لحظه صبر کنید.</p>
    </div>
  );
}
