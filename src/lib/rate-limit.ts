import { NextRequest } from 'next/server';
import { RateLimitError } from '@/lib/error-handler';

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

function prune(now: number) {
  if (store.size < 5000) return;
  for (const [k, v] of store) {
    if (v.resetAt <= now) store.delete(k);
  }
}

export class RateLimiter {
  static getIP(request: NextRequest): string {
    const xf = request.headers.get('x-forwarded-for');
    if (xf) return xf.split(',')[0].trim();
    const real = request.headers.get('x-real-ip');
    if (real) return real.trim();
    return 'unknown';
  }

  /**
   * @param key شناسه (معمولاً IP)
   * @param action نام عملیات
   * @param limit حداکثر تعداد
   * @param windowMs بازه زمانی میلی‌ثانیه
   */
  static check(key: string, action: string, limit: number, windowMs: number): void {
    const now = Date.now();
    prune(now);
    const id = `${action}:${key}`;
    const cur = store.get(id);
    if (!cur || cur.resetAt <= now) {
      store.set(id, { count: 1, resetAt: now + windowMs });
      return;
    }
    if (cur.count >= limit) {
      throw new RateLimitError('تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید.');
    }
    cur.count += 1;
    store.set(id, cur);
  }
}

/** سازگاری با import قدیمی */
export { RateLimiter as default };
