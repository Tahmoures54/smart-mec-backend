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
    if (data.resetAt <= now) rateLimitStore.delete(key);
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
    const safeIp = ip.trim().slice(0, 128) || 'unknown';
    const key = `${safeIp}:${action}`;
    const now = Date.now();
    cleanup(now);

    const record = rateLimitStore.get(key);
    if (!record || now >= record.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }

    if (record.count >= limit) {
      logger.warn('Rate limit exceeded', { action, ip: safeIp });
      throw new RateLimitError(
        `تعداد درخواست‌ها بیش از حد مجاز است. لطفاً ${Math.ceil(
          (record.resetAt - now) / 1000
        )} ثانیه دیگر تلاش کنید.`
      );
    }

    record.count += 1;
  }

  static checkComposite(
    identifiers: Array<{ value: string; label: string }>,
    action: string,
    limit: number,
    windowMs: number
  ): void {
    for (const identifier of identifiers) {
      const value = identifier.value.trim();
      if (value) this.check(value, `${action}:${identifier.label}`, limit, windowMs);
    }
  }

  static getIP(req: Request): string {
    // Prefer the platform-provided client IP. Only trust forwarding headers when
    // the deployment explicitly enables it; otherwise clients could spoof them.
    const trustForwarded = process.env.TRUST_PROXY_HEADERS === 'true';
    if (trustForwarded) {
      const forwardedFor = req.headers.get('x-forwarded-for');
      if (forwardedFor) return forwardedFor.split(',')[0].trim().slice(0, 128);
      const realIp = req.headers.get('x-real-ip');
      if (realIp) return realIp.trim().slice(0, 128);
    }
    return req.headers.get('cf-connecting-ip')?.trim().slice(0, 128) || 'unknown';
  }
}
