// ═══════════════════════════════════════════════════════════
// Rate Limiter — Upstash Redis (production) + In-Memory fallback
// Smart-MEC
// ═══════════════════════════════════════════════════════════

import { Redis } from '@upstash/redis';
import { RateLimitError } from './error-handler';
import { logger } from '@/utils/logger';

interface RateLimitData {
  count: number;
  resetAt: number;
}

const PREFIX = 'sm:rl';

// ─── In-memory fallback (local / missing env) ───
const memoryStore = new Map<string, RateLimitData>();

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of memoryStore.entries()) {
      if (data.resetAt < now) memoryStore.delete(key);
    }
  }, 5 * 60 * 1000);
}

function checkMemory(
  key: string,
  limit: number,
  windowMs: number,
  ip: string,
  action: string
): void {
  const now = Date.now();
  const record = memoryStore.get(key);

  if (!record || now > record.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (record.count >= limit) {
    logger.warn(`Rate limit exceeded (memory) for IP: ${ip} on action: ${action}`);
    throw new RateLimitError(
      `تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً ${Math.ceil(
        (record.resetAt - now) / 1000
      )} ثانیه دیگر تلاش کنید.`
    );
  }

  record.count += 1;
  memoryStore.set(key, record);
}

// ─── Upstash Redis client (lazy) ───
let redis: Redis | null = null;
let redisInitTried = false;

function getRedis(): Redis | null {
  if (redisInitTried) return redis;
  redisInitTried = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    logger.warn(
      'Upstash Redis not configured — using in-memory rate limiter (not suitable for multi-instance)'
    );
    return null;
  }

  try {
    redis = new Redis({ url, token });
    logger.info('Upstash Redis rate limiter initialized');
    return redis;
  } catch (err) {
    logger.error('Failed to init Upstash Redis, falling back to memory', err);
    return null;
  }
}

/**
 * Fixed-window counter via INCR + PEXPIRE.
 * Atomic enough for rate limiting; if Redis fails, falls back to memory.
 */
async function checkRedis(
  client: Redis,
  key: string,
  limit: number,
  windowMs: number,
  ip: string,
  action: string
): Promise<void> {
  try {
    const count = await client.incr(key);

    if (count === 1) {
      // اولین درخواست در این پنجره — TTL را ست کن
      await client.pexpire(key, windowMs);
    }

    if (count > limit) {
      const ttl = await client.pttl(key);
      const waitSec = Math.max(1, Math.ceil((ttl > 0 ? ttl : windowMs) / 1000));

      logger.warn(`Rate limit exceeded (redis) for IP: ${ip} on action: ${action}`, {
        count,
        limit,
        ttl,
      });

      throw new RateLimitError(
        `تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً ${waitSec} ثانیه دیگر تلاش کنید.`
      );
    }
  } catch (err) {
    if (err instanceof RateLimitError) throw err;

    // Redis down → fallback to memory so API stays available
    logger.error('Redis rate limit error, falling back to memory', err);
    checkMemory(key, limit, windowMs, ip, action);
  }
}

export class RateLimiter {
  /**
   * بررسی محدودیت درخواست (async)
   * @param ip آدرس IP کاربر
   * @param action نوع عملیات (مثلاً send_otp)
   * @param limit حداکثر تعداد درخواست مجاز
   * @param windowMs بازه زمانی به میلی‌ثانیه
   */
  static async check(
    ip: string,
    action: string,
    limit: number,
    windowMs: number
  ): Promise<void> {
    const key = `${PREFIX}:${action}:${ip}`;
    const client = getRedis();

    if (client) {
      await checkRedis(client, key, limit, windowMs, ip, action);
    } else {
      checkMemory(key, limit, windowMs, ip, action);
    }
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
    return '127.0.0.1';
  }
}
