// Purchase Verify Route - Smart-MEC (Zibal)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { purchases, users, analyticsEvents } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { PRODUCTS, ProductId } from '@/types';
import { applyGaragePromoAfterPayment } from '@/lib/garage-promo-payment';
import { logger } from '@/utils/logger';
import { escapeHtml } from '@/lib/html';
import {
  computeGoldenExpiry,
  computeReferralCommission,
  isMockAuthority,
} from '@/lib/payment';
import { referralPercentage } from '@/lib/constants';

const ZIBAL_VERIFY_URL = 'https://gateway.zibal.ir/v1/verify';
const ZIBAL_TIMEOUT_MS = 15000;

function page(title: string, message: string, ok: boolean, fromWeb = false) {
  const backHref = fromWeb ? '/diagnose' : ok ? 'smartmec://success' : 'smartmec://failed';
  const backLabel = fromWeb ? 'بازگشت به عیب‌یابی' : 'بازگشت به اپلیکیشن';
  const autoJs = fromWeb
    ? ''
    : `<script>setTimeout(function(){try{location.replace(${JSON.stringify(
        ok ? 'smartmec://success' : 'smartmec://failed'
      )});}catch(e){}},400);</script>`;
  const html = `<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeHtml(
    title
  )}</title>
  <meta http-equiv="refresh" content="${fromWeb ? '2' : '1'};url=${backHref}" />
  ${autoJs}
  <style>body{font-family:Tahoma,sans-serif;background:#140C08;color:#f5e6d3;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:24px;text-align:center}
  .card{max-width:420px;background:#1A120E;border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:28px}
  .ok{color:#66bb6a}.bad{color:#e57373}a{display:inline-block;margin-top:18px;padding:12px 20px;border-radius:12px;background:#ff9800;color:#111;text-decoration:none;font-weight:700}</style></head>
  <body><div class="card"><h1 class="${ok ? 'ok' : 'bad'}">${escapeHtml(
    title
  )}</h1><p>${message}</p><a href="${backHref}">${backLabel}</a></div></body></html>`;
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

async function grantProduct(tx: any, userId: number, product: (typeof PRODUCTS)[ProductId]) {
  const user = await tx.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return;
  if (product.goldenDays) {
    await tx
      .update(users)
      .set({
        isGolden: true,
        goldenExpiresAt: computeGoldenExpiry(user.goldenExpiresAt, product.goldenDays),
        monthlyLimit: product.monthlyLimit ?? user.monthlyLimit,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  } else if (product.credits) {
    await tx
      .update(users)
      .set({
        credits: sql`${users.credits} + ${product.credits}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }
}

async function creditReferrerCommission(tx: any, userId: number, amount: number) {
  const user = await tx.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user?.referredBy) return;
  const pct =
    typeof referralPercentage === 'function' ? referralPercentage() : Number(referralPercentage);
  const commission = computeReferralCommission(amount, pct);
  if (commission <= 0) return;
  await tx
    .update(users)
    .set({
      earnings: sql`${users.earnings} + ${commission}`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.referredBy));
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const trackId = url.searchParams.get('trackId') || url.searchParams.get('authority') || '';
    let productId = (url.searchParams.get('productId') || '') as ProductId;
    const fromWeb = url.searchParams.get('from') === 'web';
    const zibalSuccess = url.searchParams.get('success');

    if (zibalSuccess === '0') {
      return page('ناموفق', 'پرداخت لغو شد یا انجام نشد.', false, fromWeb);
    }

    if (!trackId) {
      return page('خطا', 'اطلاعات پرداخت ناقص است.', false, fromWeb);
    }

    const found = await db
      .select()
      .from(purchases)
      .where(eq(purchases.authority, trackId))
      .limit(1);
    const purchase = found[0];
    if (!purchase) {
      return page('یافت نشد', 'تراکنش پیدا نشد.', false, fromWeb);
    }

    if (!productId || !(productId in PRODUCTS)) {
      productId = purchase.productId as ProductId;
    }
    const product = PRODUCTS[productId];
    if (!product) {
      return page('خطا', 'محصول نامعتبر است.', false, fromWeb);
    }

    if (purchase.status === 'completed') {
      return page('پرداخت موفق', `${product.name} قبلاً فعال شده است.`, true, fromWeb);
    }

    let finalRefNumber = '';
    const merchant = process.env.ZIBAL_MERCHANT_ID;
    // فقط MOCK واقعی یا محیط بدون merchant در غیرپروداکشن → شبیه‌سازی
    if (isMockAuthority(trackId) || (!merchant && process.env.NODE_ENV !== 'production')) {
      finalRefNumber = `MOCK-${Date.now()}`;
    } else {
      if (!merchant) {
        return page('خطا', 'پیکربندی درگاه ناقص است (ZIBAL_MERCHANT_ID).', false, fromWeb);
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ZIBAL_TIMEOUT_MS);
      try {
        const res = await fetch(ZIBAL_VERIFY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ merchant, trackId: Number(trackId) }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (data.result !== 100 && data.result !== 201) {
          await db
            .update(purchases)
            .set({ status: 'failed', updatedAt: new Date() })
            .where(eq(purchases.id, purchase.id));
          return page('ناموفق', 'پرداخت تأیید نشد.', false, fromWeb);
        }
        finalRefNumber = String(data.refNumber || '');
      } catch (e) {
        logger.error('Zibal verify error', e);
        return page('خطا', 'ارتباط با درگاه برقرار نشد.', false, fromWeb);
      } finally {
        clearTimeout(timer);
      }
    }

    const claimed = await db.transaction(async (tx) => {
      const rows = await tx
        .update(purchases)
        .set({ status: 'completed', refId: finalRefNumber, updatedAt: new Date() })
        .where(and(eq(purchases.id, purchase.id), eq(purchases.status, 'pending')))
        .returning({ id: purchases.id });
      if (rows.length === 0) return [];
      await grantProduct(tx, purchase.userId, product);
      await creditReferrerCommission(tx, purchase.userId, purchase.amount);
      await applyGaragePromoAfterPayment(tx, purchase);
      return rows;
    });

    if (claimed.length === 0) {
      return page('پرداخت موفق', `${product.name} قبلاً به حساب اضافه شده است.`, true, fromWeb);
    }

    try {
      await db.insert(analyticsEvents).values({
        event: 'pay_success',
        userId: purchase.userId,
        path: '/api/purchase/verify',
        props: { productId, amount: purchase.amount, trackId },
      });
    } catch {
      /* non-blocking */
    }

    logger.info(`Payment success user=${purchase.userId} product=${productId}`);
    return page(
      'پرداخت موفق',
      `${product.name} فعال شد.${finalRefNumber ? ` کد: ${escapeHtml(finalRefNumber)}` : ''}`,
      true,
      fromWeb
    );
  } catch (error) {
    logger.error('Verify Route Error:', error);
    return page('خطای سیستمی', 'مشکلی رخ داد.', false, true);
  }
}
