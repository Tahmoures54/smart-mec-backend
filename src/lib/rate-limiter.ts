// ═══════════════════════════════════════════════════════════
// Rate Limiter (In-Memory) - Smart-MEC
// روی چند اینستنس (Vercel) این محدودیت تقریبی است؛ روی Liara کافی است.
// ═══════════════════════════════════════════════════════════

import { RateLimitError } from './error-handler';
import { logger } from '@/utils/logger';

interface RateLimitData {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitData>();
const MAX_KEYS = 20_000;
let lastCleanup = 0;

function cleanup(now: number) {
  if (now - lastCleanup < 60_000 && rateLimitStore.size < MAX_KEYS) return;
  lastCleanup = now;
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
  if (rateLimitStore.size > MAX_KEYS) {
    const extra = rateLimitStore.size - MAX_KEYS;
    let removed = 0;
    for (const key of rateLimitStore.keys()) {
      rateLimitStore.delete(key);
      removed += 1;
      if (removed >= extra) break;
    }
  }
}

export class RateLimiter {
  static check(ip: string, action: string, limit: number, windowMs: number): void {
    const key = `${ip}:${action}`;
    const now = Date.now();
    cleanup(now);
    const record = rateLimitStore.get(key);

    if (!record || now > record.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }

    if (record.count >= limit) {
      logger.warn(`Rate limit exceeded for IP: ${ip} on action: ${action}`);
      throw new RateLimitError(
        `تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً ${Math.ceil(
          (record.resetAt - now) / 1000
        )} ثانیه دیگر تلاش کنید.`
      );
    }

    record.count += 1;
    rateLimitStore.set(key, record);
  }

  static getIP(req: Request): string {
    const forwardedFor = req.headers.get('x-forwarded-for');
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }
    const realIp = req.headers.get('x-real-ip');
    if (realIp) {
      return realIp.trim();
    }
    return '127.0.0.1';
  }
}
