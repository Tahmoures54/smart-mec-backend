// ═══════════════════════════════════════════════════════════
// Product Analytics Events - Smart-MEC
// برای جذب کاربر و تصمیم‌گیری بر اساس داده واقعی
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDbReady } from '@/db';
import { events } from '@/db/schema';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';
import { handleError, BadRequestError } from '@/lib/error-handler';
import { RateLimiter } from '@/lib/rate-limiter';
import { logger } from '@/utils/logger';

const ALLOWED_EVENTS = new Set([
  'app_open',
  'app_install',
  'screen_view',
  'login_success',
  'login_failed',
  'diagnose_start',
  'diagnose_success',
  'diagnose_error',
  'purchase_start',
  'purchase_success',
  'purchase_failed',
  'referral_share',
  'referral_copy',
  'credit_low',
  'golden_view',
  'feedback_submit',
  'cars_browse',
]);

export async function POST(request: NextRequest) {
  try {
    await ensureDbReady();

    const ip = RateLimiter.getIP(request);
    await RateLimiter.check(ip, 'events', 60, 60 * 1000); // 60 event/min per IP

    const body = await request.json();
    const eventName = String(body.eventName || body.name || '').trim();

    if (!eventName || eventName.length > 64) {
      throw new BadRequestError('نام رویداد نامعتبر است');
    }

    // فقط رویدادهای شناخته‌شده (جلوگیری از اسپم کلیدهای بی‌معنی)
    if (!ALLOWED_EVENTS.has(eventName) && !eventName.startsWith('custom_')) {
      throw new BadRequestError(
        `رویداد «${eventName}» مجاز نیست. از لیست استاندارد استفاده کنید.`
      );
    }

    let userId: number | null = null;
    try {
      const token = getTokenFromRequest(request);
      if (token) {
        const payload = await verifyToken(token);
        userId = payload.userId ?? null;
      }
    } catch {
      // توکن اختیاری است — رویداد ناشناس هم قبول می‌شود
    }

    const properties =
      body.properties && typeof body.properties === 'object'
        ? JSON.stringify(body.properties).slice(0, 4000)
        : typeof body.properties === 'string'
          ? body.properties.slice(0, 4000)
          : null;

    const platform = body.platform
      ? String(body.platform).slice(0, 32)
      : null;
    const appVersion = body.appVersion
      ? String(body.appVersion).slice(0, 32)
      : null;

    await db.insert(events).values({
      userId,
      eventName,
      properties,
      platform,
      appVersion,
      ip,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // analytics نباید UX را خراب کند — در production خطا را لاگ کن اما 200 برگردان برای non-critical
    if (
      error instanceof Error &&
      !(error.name === 'BadRequestError' || (error as any).statusCode === 400)
    ) {
      logger.warn('Event ingest soft-fail', error);
      return NextResponse.json({ success: true, soft: true });
    }
    return handleError(error);
  }
}
