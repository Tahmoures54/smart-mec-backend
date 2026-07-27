// ═══════════════════════════════════════════════════════════
// Rate Limiter (In-Memory) - Smart-MEC
// ═══════════════════════════════════════════════════════════

import { RateLimitError } from './error-handler';
import { logger } from '@/utils/logger';

interface RateLimitData {
  count: number;
  resetAt: number;
}

// چون پروژه روی Liara به صورت Single Instance اجرا می‌شود، 
// یک Map درون‌حافظه‌ای کارآمد و سریع است.
const rateLimitStore = new Map<string, RateLimitData>();

/**
 * پاکسازی خودکار رکوردهای منقضی شده هر 5 دقیقه
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export class RateLimiter {
  /**
   * بررسی محدودیت درخواست
   * @param ip آدرس IP کاربر
   * @param action نوع عملیات (مثلا 'send_otp')
   * @param limit حداکثر تعداد درخواست مجاز
   * @param windowMs بازه زمانی به میلی‌ثانیه
   */
  static check(ip: string, action: string, limit: number, windowMs: number): void {
    const key = `${ip}:${action}`;
    const now = Date.now();
    const record = rateLimitStore.get(key);

    if (!record) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }

    if (now > record.resetAt) {
      // زمان منقضی شده، ریست می‌کنیم
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

  /**
   * استخراج IP واقعی کاربر از درخواست
   */
  static getIP(req: Request): string {
    const forwardedFor = req.headers.get('x-forwarded-for');
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }
    const realIp = req.headers.get('x-real-ip');
    if (realIp) {
      return realIp.trim();
    }
    return '127.0.0.1'; // در محیط محلی
  }
}