'use client';

import { useEffect, useState } from 'react';

export function StatusBadge() {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((data: { status?: string }) => setOnline(data.status === 'ok'))
      .catch(() => setOnline(false));
  }, []);

  const label = online === null ? 'در حال بررسی' : online ? 'آنلاین' : 'محدود';
  const color =
    online === null ? 'bg-amber-400' : online ? 'bg-emerald-400' : 'bg-amber-500';

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-amber-100/80">
      <span className={`h-2 w-2 rounded-full ${color} ${online ? 'animate-pulse' : ''}`} />
      {label}
    </span>
  );
}
