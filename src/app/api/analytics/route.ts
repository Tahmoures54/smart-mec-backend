import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDbReady } from '@/db';
import { analyticsEvents } from '@/db/schema';
import { ensureAnalyticsTables } from '@/lib/ensure-analytics';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';
import { RateLimiter } from '@/lib/rate-limiter';

const ALLOWED = new Set([
  'diagnose_started',
  'diagnose_success',
  'buy_view',
  'buy_click',
  'pay_success',
  'garage_register',
  'garage_promo_click',
  'recovery_sms_sent',
]);

export async function POST(request: NextRequest) {
  try {
    await ensureDbReady();
    await ensureAnalyticsTables();
    const ip = RateLimiter.getIP(request);
    RateLimiter.check(ip, 'analytics', 120, 60 * 1000);

    const body = await request.json().catch(() => ({}));
    const event = String(body.event || '');
    if (!ALLOWED.has(event)) {
      return NextResponse.json({ success: false, error: 'event نامعتبر' }, { status: 400 });
    }

    let userId: number | null = null;
    try {
      const token = getTokenFromRequest(request);
      if (token) {
        const payload = await verifyToken(token);
        if (payload?.userId) userId = Number(payload.userId);
      }
    } catch {
      /* anonymous */
    }

    await db.insert(analyticsEvents).values({
      event,
      sessionId: body.sessionId ? String(body.sessionId).slice(0, 64) : null,
      userId,
      path: body.path ? String(body.path).slice(0, 200) : null,
      props: body.props && typeof body.props === 'object' ? body.props : {},
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}
