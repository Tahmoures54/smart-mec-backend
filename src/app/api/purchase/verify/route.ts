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
import {
  allowMockPayments,
  amountsMatchTomanAndRial,
  isSuccessfulVerifyResult,
  isUserCanceledCallback,
  parsePurchaseIdFromOrderId,
  verifyResultMessage,
  verifyZibalPayment,
  ZibalError,
} from '@/lib/zibal';

function backHref(fromWeb: boolean, ok: boolean, productId?: string) {
  if (!fromWeb) return ok ? 'smartmec://success' : 'smartmec://failed';
  if (productId?.startsWith('garage_')) return ok ? '/garage?paid=1' : '/garage?paid=0';
  return ok ? '/buy?paid=1' : '/buy?paid=0';
}

function backLabel(fromWeb: boolean, productId?: string) {
  if (!fromWeb) return 'بازگشت به اپلیکیشن';
  if (productId?.startsWith('garage_')) return 'بازگشت به صفحه تعمیرگاه';
  return 'بازگشت به شارژ اعتبار';
}

function page(
  title: string,
  message: string,
  ok: boolean,
  fromWeb = false,
  productId?: string
) {
  const href = backHref(fromWeb, ok, productId);
  const label = backLabel(fromWeb, productId);
  const autoJs = fromWeb
    ? ''
    : `<script>setTimeout(function(){try{location.replace(${JSON.stringify(
        ok ? 'smartmec://success' : 'smartmec://failed'
      )});}catch(e){}},400);</script>`;
  const html = `<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeHtml(
    title
  )}</title>
  <meta http-equiv="refresh" content="${fromWeb ? '2' : '1'};url=${href}" />
  ${autoJs}
  <style>body{font-family:Tahoma,sans-serif;background:#140C08;color:#f5e6d3;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:24px;text-align:center}
  .card{max-width:420px;background:#1A120E;border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:28px}
  .ok{color:#66bb6a}.bad{color:#e57373}a{display:inline-block;margin-top:18px;padding:12px 20px;border-radius:12px;background:#ff9800;color:#111;text-decoration:none;font-weight:700}</style></head>
  <body><div class="card"><h1 class="${ok ? 'ok' : 'bad'}">${escapeHtml(
    title
  )}</h1><p>${message}</p><a href="${href}">${label}</a></div></body></html>`;
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

async function handleVerify(request: NextRequest) {
  try {
    const url = new URL(request.url);
    let body: Record<string, string> = {};
    if (request.method === 'POST') {
      const contentType = request.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        body = Object.fromEntries(
          Object.entries(json).map(([k, v]) => [k, v == null ? '' : String(v)])
        );
      } else {
        const form = await request.formData().catch(() => null);
        if (form) {
          body = Object.fromEntries(
            [...form.entries()].map(([k, v]) => [k, typeof v === 'string' ? v : ''])
          );
        }
      }
    }

    const param = (name: string) =>
      url.searchParams.get(name) || body[name] || '';

    const trackId = param('trackId') || param('authority');
    const orderId = param('orderId');
    let productId = param('productId') as ProductId;
    const fromWeb = param('from') === 'web';
    const success = param('success') || null;
    const status = param('status') || null;

    if (isUserCanceledCallback(success, status)) {
      return page('ناموفق', 'پرداخت لغو شد یا انجام نشد.', false, fromWeb, productId);
    }

    if (!trackId && !orderId) {
      return page('خطا', 'اطلاعات پرداخت ناقص است.', false, fromWeb, productId);
    }

    let purchase =
      (trackId
        ? (
            await db
              .select()
              .from(purchases)
              .where(eq(purchases.authority, trackId))
              .limit(1)
          )[0]
        : undefined) || undefined;

    if (!purchase) {
      const parsedId = parsePurchaseIdFromOrderId(orderId);
      if (parsedId) {
        purchase = (
          await db.select().from(purchases).where(eq(purchases.id, parsedId)).limit(1)
        )[0];
      }
    }

    if (!purchase) {
      return page('یافت نشد', 'تراکنش پیدا نشد.', false, fromWeb, productId);
    }

    if (!productId || !(productId in PRODUCTS)) {
      productId = purchase.productId as ProductId;
    }
    const product = PRODUCTS[productId];
    if (!product) {
      return page('خطا', 'محصول نامعتبر است.', false, fromWeb, productId);
    }

    if (purchase.status === 'completed') {
      return page(
        'پرداخت موفق',
        `${escapeHtml(product.name)} قبلاً فعال شده است.`,
        true,
        fromWeb,
        productId
      );
    }

    let finalRefNumber = '';
    const mockOk = isMockAuthority(trackId) && allowMockPayments();
    if (mockOk) {
      finalRefNumber = `MOCK-${Date.now()}`;
    } else {
      if (isMockAuthority(trackId)) {
        return page('خطا', 'پرداخت آزمایشی در محیط انتشار مجاز نیست.', false, fromWeb, productId);
      }
      try {
        const data = await verifyZibalPayment(trackId || purchase.authority || '');
        if (!isSuccessfulVerifyResult(data.result)) {
          await db
            .update(purchases)
            .set({ status: 'failed', updatedAt: new Date() })
            .where(eq(purchases.id, purchase.id));
          return page(
            'ناموفق',
            escapeHtml(data.message || verifyResultMessage(data.result)),
            false,
            fromWeb,
            productId
          );
        }
        if (
          data.amountRial != null &&
          Number.isFinite(data.amountRial) &&
          !amountsMatchTomanAndRial(purchase.amount, data.amountRial)
        ) {
          logger.error('Zibal amount mismatch', {
            purchaseId: purchase.id,
            expectedToman: purchase.amount,
            gatewayRial: data.amountRial,
          });
          return page('خطا', 'مبلغ پرداخت با سفارش هم‌خوانی ندارد.', false, fromWeb, productId);
        }
        finalRefNumber = data.refNumber;
      } catch (e) {
        logger.error('Zibal verify error', e);
        const message = e instanceof ZibalError ? e.message : 'ارتباط با درگاه برقرار نشد.';
        return page('خطا', escapeHtml(message), false, fromWeb, productId);
      }
    }

    const claimed = await db.transaction(async (tx) => {
      const rows = await tx
        .update(purchases)
        .set({
          status: 'completed',
          refId: finalRefNumber,
          authority: trackId || purchase.authority,
          updatedAt: new Date(),
        })
        .where(and(eq(purchases.id, purchase.id), eq(purchases.status, 'pending')))
        .returning({ id: purchases.id });
      if (rows.length === 0) return [];
      await grantProduct(tx, purchase.userId, product);
      await creditReferrerCommission(tx, purchase.userId, purchase.amount);
      await applyGaragePromoAfterPayment(tx, purchase);
      return rows;
    });

    if (claimed.length === 0) {
      return page(
        'پرداخت موفق',
        `${escapeHtml(product.name)} قبلاً به حساب اضافه شده است.`,
        true,
        fromWeb,
        productId
      );
    }

    try {
      await db.insert(analyticsEvents).values({
        event: 'pay_success',
        userId: purchase.userId,
        path: '/api/purchase/verify',
        props: { productId, amount: purchase.amount, trackId, orderId },
      });
    } catch {
      /* non-blocking */
    }

    logger.info(`Payment success user=${purchase.userId} product=${productId}`);
    return page(
      'پرداخت موفق',
      `${escapeHtml(product.name)} فعال شد.${
        finalRefNumber ? ` کد پیگیری: ${escapeHtml(finalRefNumber)}` : ''
      }`,
      true,
      fromWeb,
      productId
    );
  } catch (error) {
    logger.error('Verify Route Error:', error);
    return page('خطای سیستمی', 'مشکلی رخ داد.', false, true);
  }
}

export async function GET(request: NextRequest) {
  return handleVerify(request);
}

export async function POST(request: NextRequest) {
  return handleVerify(request);
}
