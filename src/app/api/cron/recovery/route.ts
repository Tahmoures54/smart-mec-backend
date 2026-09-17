import { NextRequest, NextResponse } from 'next/server';
import { getSqlite } from '@/db';
import { ensureAnalyticsTables } from '@/lib/ensure-analytics';
import { logger } from '@/utils/logger';

/** GET /api/cron/recovery?secret=CRON_SECRET */
export async function GET(request: NextRequest) {
  try {
    const secret = request.nextUrl.searchParams.get('secret') || '';
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await ensureAnalyticsTables();
    const sqlite = getSqlite();

    // بازه‌های زمانی بر حسب ثانیه (unix epoch)
    const now = Math.floor(Date.now() / 1000);
    const day = 86400;
    const thirtyDaysAgo = now - 30 * day;
    const sevenDaysAgo = now - 7 * day;
    const twoDaysAgo = now - 2 * day;

    const candidates = sqlite
      .prepare(
        `
        SELECT u.id, u.phone
        FROM users u
        WHERE COALESCE(u.marketing_opt_in, 0) = 1
          AND (u.recovery_sms_at IS NULL OR u.recovery_sms_at < ?)
          AND EXISTS (
            SELECT 1 FROM diagnostics d
            WHERE d.user_id = u.id
              AND d.created_at >= ?
              AND d.created_at <= ?
          )
          AND NOT EXISTS (
            SELECT 1 FROM purchases p
            WHERE p.user_id = u.id AND p.status = 'completed'
          )
        LIMIT 40
      `
      )
      .all(thirtyDaysAgo, sevenDaysAgo, twoDaysAgo) as { id: number; phone: string }[];

    const appUrl = process.env.APP_URL || 'https://smart-mec.ir';
    const apiKey = process.env.KAVENEGAR_API_KEY;
    let sent = 0;

    const updateUser = sqlite.prepare(
      `UPDATE users SET recovery_sms_at = ?, updated_at = ? WHERE id = ?`
    );
    const insertEvent = sqlite.prepare(
      `INSERT INTO analytics_events (event, user_id, path, props, created_at)
       VALUES ('recovery_sms_sent', ?, '/api/cron/recovery', '{}', ?)`
    );

    for (const u of candidates) {
      const msg = `مکانیک هوشمند: برای ادامه عیب‌یابی خودرو، بسته اعتبار را از اینجا فعال کن: ${appUrl}/buy?reason=recovery`;
      let ok = false;

      if (apiKey) {
        try {
          const url = `https://api.kavenegar.com/v1/${apiKey}/sms/send.json`;
          const params = new URLSearchParams({ receptor: u.phone, message: msg });
          const res = await fetch(`${url}?${params}`, { method: 'GET' });
          const data = await res.json();
          ok = !!(data.return && data.return.status === 200);
        } catch (e) {
          logger.warn('recovery sms fail', e);
        }
      } else {
        logger.info(`[DEV recovery SMS] ${u.phone}: ${msg}`);
        ok = true;
      }

      if (ok) {
        const ts = Math.floor(Date.now() / 1000);
        updateUser.run(ts, ts, u.id);
        insertEvent.run(u.id, ts);
        sent += 1;
      }
    }

    return NextResponse.json({
      success: true,
      candidates: candidates.length,
      sent,
    });
  } catch (e) {
    logger.error('recovery cron', e);
    return NextResponse.json({ success: false, error: 'خطا' }, { status: 500 });
  }
}
