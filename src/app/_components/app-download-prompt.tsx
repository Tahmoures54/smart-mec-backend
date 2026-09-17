'use client';

import { useEffect, useState } from 'react';

export function AppDownloadPrompt({ href }: { href: string | null }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!href) return;

    const key = 'smart-mec-app-prompt-seen';
    const lastSeen = Number(window.localStorage.getItem(key) || 0);
    const day = 24 * 60 * 60 * 1000;

    if (Date.now() - lastSeen < day) return;

    const timer = window.setTimeout(() => setVisible(true), 1400);
    return () => window.clearTimeout(timer);
  }, [href]);

  if (!href || !visible) return null;

  function dismiss() {
    window.localStorage.setItem('smart-mec-app-prompt-seen', String(Date.now()));
    setVisible(false);
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-lg sm:inset-x-auto sm:right-5 sm:left-auto">
      <div className="relative overflow-hidden rounded-3xl border border-orange-300/25 bg-[#1b100b]/95 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-orange-500/20 blur-2xl" />
        <button
          type="button"
          onClick={dismiss}
          aria-label="بستن"
          className="absolute left-3 top-3 rounded-full p-1.5 text-amber-100/50 hover:bg-white/10 hover:text-white"
        >
          <span aria-hidden>×</span>
        </button>

        <div className="relative flex items-center gap-3 pr-1 pl-7">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500/15 text-2xl ring-1 ring-orange-300/20">
            🚗
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-white">اپ مکانیک هوشمند را هم امتحان کن</p>
            <p className="mt-1 text-xs leading-5 text-amber-100/65">
              عیب‌یابی را همیشه همراهت داشته باش؛ سریع‌تر و راحت‌تر.
            </p>
          </div>
          <a
            href={href}
            className="shrink-0 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-orange-950/30 transition hover:bg-orange-400"
          >
            دانلود اپ
          </a>
        </div>
      </div>
    </div>
  );
}
