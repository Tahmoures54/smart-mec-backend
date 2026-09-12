'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Health = {
  status: string;
  checks?: { database?: { ok?: boolean; latencyMs?: number; error?: string } };
};

export function HealthPanel() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ status: 'degraded' }));
  }, []);

  const online = health?.status === 'ok';
  const dbOk = health?.checks?.database?.ok;

  return (
    <div className="bg-gray-800 p-6 rounded-lg border border-orange-500/30">
      <h2 className="text-xl font-semibold mb-4 text-orange-400">وضعیت سرور</h2>
      <div className="flex items-center gap-2">
        <div
          className={`w-3 h-3 rounded-full ${online ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`}
        />
        <span className={online ? 'text-green-400' : 'text-amber-400'}>
          {health
            ? online
              ? 'آماده سرویس‌دهی'
              : 'حالت محدود (دیتابیس در دسترس نیست)'
            : 'در حال بررسی…'}
        </span>
      </div>
      <p className="text-sm text-gray-400 mt-3">
        دیتابیس:{' '}
        {dbOk
          ? `سالم (${health?.checks?.database?.latencyMs}ms)`
          : health
            ? 'قطع / پیکربندی نشده'
            : '…'}
      </p>
      <div className="mt-4 flex gap-4 text-sm">
        <Link href="/api/health" dir="ltr" className="text-orange-400 hover:text-orange-300 underline">
          /api/health
        </Link>
        <Link href="/admin" dir="ltr" className="text-orange-400 hover:text-orange-300 underline">
          /admin
        </Link>
      </div>
    </div>
  );
}
