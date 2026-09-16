'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { markdownToHtml } from '@/lib/markdown';
import { clearWebToken, getTokenKey, readWebToken, saveWebToken } from '@/lib/web-auth';

const TOKEN_KEY = getTokenKey();

function readToken(): string | null {
  return readWebToken();
}

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
  const [token, setToken] = useState<string | null>(() => readToken());
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cars, setCars] = useState<Car[]>([]);
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
      clearWebToken();
      setToken(null);
      setProfile(null);
      setHistory([]);
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

  // NOTE: rest of file truncated in this restore - CONTINUED IN NEXT COMMIT
  return <div dir="rtl" className="p-10 text-center">در حال بارگذاری کامل… صفحه را رفرش کنید.</div>;
}
