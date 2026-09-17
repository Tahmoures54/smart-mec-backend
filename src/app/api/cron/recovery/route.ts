import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { ensureAnalyticsTables } from '@/lib/ensure-analytics';
import { logger } from '@/utils/logger';

/** GET /api/cron/recovery?secret=CRON_SECRET */
export async function GET(request: NextRequest) {
  try {
    const secret = request.nextUrl.searchParams.get('secret') || '';
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ success: false, error: 'No DB' }, { status: 500 });
    }

    await ensureAnalyticsTables();
    const sql = neon(process.env.DATABASE_URL);

    const candidates = await sql`
      SELECT u.id, u.phone
      FROM users u
      WHERE COALESCE(u.marketing_opt_in, false) = true
        AND (u.recovery_sms_at IS NULL OR u.recovery_sms_at < NOW() - INTERVAL '30 days')
        AND EXISTS (
          SELECT 1 FROM diagnostics d
          WHERE d.user_id = u.id
            AND d.created_at >= NOW() - INTERVAL '7 days'
            AND d.created_at <= NOW() - INTERVAL '2 days'
        )
        AND NOT EXISTS (
          SELECT 1 FROM purchases p
          WHERE p.user_id = u.id AND p.status = 'completed'
        )
      LIMIT 40
    `;

    const appUrl = process.env.APP_URL || 'https://smart-mec.ir';
    const apiKey = process.env.KAVENEGAR_API_KEY;
    let sent = 0;

    for (const u of candidates as { id: number; phone: string }[]) {
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
        await sql`UPDATE users SET recovery_sms_at = NOW(), updated_at = NOW() WHERE id = ${u.id}`;
        await sql`
          INSERT INTO analytics_events (event, user_id, path, props)
          VALUES ('recovery_sms_sent', ${u.id}, '/api/cron/recovery', '{}'::jsonb)
        `;
        sent += 1;
      }
    }

    return NextResponse.json({
      success: true,
      candidates: (candidates as unknown[]).length,
      sent,
    });
  } catch (e) {
    logger.error('recovery cron', e);
    return NextResponse.json({ success: false, error: 'خطا' }, { status: 500 });
  }
}
