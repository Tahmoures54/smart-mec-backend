import Image from 'next/image';
import Link from 'next/link';
import { SITE } from '@/lib/site';
import { StatusBadge } from './status-badge';

export function SiteHeader({ showStatus = true }: { showStatus?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#140C08]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/branding/logo.svg"
            alt={SITE.nameFa}
            width={40}
            height={40}
            className="h-10 w-10"
            unoptimized
            priority
          />
          <span className="leading-tight">
            <span className="block text-sm font-bold text-white">{SITE.nameFa}</span>
            <span className="block text-xs text-amber-200/70">{SITE.tagline}</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-amber-100/80 md:flex">
          <Link href="/diagnose" className="hover:text-white">
            عیب‌یابی
          </Link>
          <Link href="/#features" className="hover:text-white">
            امکانات
          </Link>
          <Link href="/#download" className="hover:text-white">
            دانلود اپ
          </Link>
          {showStatus ? <StatusBadge /> : null}
        </nav>

        <Link
          href="/diagnose"
          className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_24px_rgba(255,122,26,0.35)] hover:bg-orange-400"
        >
          عیب‌یابی آنلاین
        </Link>
      </div>
    </header>
  );
}
