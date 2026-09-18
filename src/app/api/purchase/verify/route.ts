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
import {
  amountsMatchTomanAndRial,
  isUserCanceledCallback,
  purchaseOrderId,
  verifyZibalPayment,
} from '@/lib/zibal';
import { referralPercentage } from '@/lib/constants';


/**
 * صفحه نتیجه پرداخت.
 * - وب: مستقیم به خانه / عیب‌یابی
 * - اپ: اول deep link، اگر باز نشد بعد از ۲ ثانیه به وب برمی‌گردد
 */
function page(title: string, message: string, ok: boolean, fromWeb = false) {
  const webSuccess = '/?paid=1';
  const webFail = '/buy?paid=0';
  const webHref = ok ? webSuccess : webFail;
  const appDeep = ok ? 'smartmec://success' : 'smartmec://failed';

  const backHref = fromWeb ? webHref : appDeep;
  const backLabel = fromWeb
    ? ok
      ? 'بازگشت به صفحه اصلی'
      : 'بازگشت به خرید'
    : 'بازگشت به اپلیکیشن';

  const autoJs = fromWeb
    ? `<script>setTimeout(function(){try{location.replace(${JSON.stringify(
        webHref
      )});}catch(e){location.href=${JSON.stringify(webHref)};}},600);</script>`
    : `<script>
(function(){
  var web=${JSON.stringify(webHref)};
  var app=${JSON.stringify(appDeep)};
  try{location.href=app;}catch(e){}
  setTimeout(function(){try{location.replace(web);}catch(e){location.href=web;}},1800);
})();
</script>`;

  const html = `<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeHtml(
    title
  )}</title>
  <meta http-equiv="refresh" content="${fromWeb ? '1' : '3'};url=${escapeHtml(webHref)}" />
  ${autoJs}
  <style>body{font-family:Tahoma,sans-serif;background:#140C08;color:#f5e6d3;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:24px;text-align:center}
  .card{max-width:420px;background:#1A120E;border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:28px}
  .ok{color:#66bb6a}.bad{color:#e57373}
  a{display:inline-block;margin:8px 6px 0;padding:12px 20px;border-radius:12px;background:#ff9800;color:#111;text-decoration:none;font-weight:700}
  a.secondary{background:transparent;border:1px solid rgba(255,255,255,.2);color:#f5e6d3}</style></head>
  <body><div class="card"><h1 class="${ok ? 'ok' : 'bad'}">${escapeHtml(
    title
  )}</h1><p>${message}</p>
  <p style="font-size:13px;opacity:.7;margin-top:12px">در حال بازگشت…</p>
  <a href="${escapeHtml(webHref)}">${fromWeb ? backLabel : 'ادامه در سایت'}</a>
  ${
    !fromWeb
      ? `<a class="secondary" href="${escapeHtml(appDeep)}">${backLabel}</a>`
      : ''
  }
  </div></body></html>`;
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function getUserById(tx: any, userId: number) {
  const rows = tx.select().from(users).where(eq(users.id, userId)).limit(1).all();
  return rows[0];
}

function grantProduct(tx: any, userId: number, product: (typeof PRODUCTS)[ProductId]) {
  const user = getUserById(tx, userId);
  if (!user) return;
  if (product.goldenDays) {
    tx.update(users)
      .set({
        isGolden: true,
        goldenExpiresAt: computeGoldenExpiry(user.goldenExpiresAt, product.goldenDays),
        monthlyLimit: product.monthlyLimit ?? user.monthlyLimit,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .run();
  } else if (product.credits) {
    tx.update(users)
      .set({
        credits: sql`${users.credits} + ${product.credits}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .run();
  }
}

function creditReferrerCommission(tx: any, userId: number, amount: number) {
  const user = getUserById(tx, userId);
  if (!user?.referredBy) return;
  const pct =
    typeof referralPercentage === 'function' ? referralPercentage() : Number(referralPercentage);
  const commission = computeReferralCommission(amount, pct);
  if (commission <= 0) return;
  tx.update(users)
    .set({
      earnings: sql`${users.earnings} + ${commission}`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.referredBy))
    .run();
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const trackId = url.searchParams.get('trackId') || url.searchParams.get('authority') || '';
    let productId = (url.searchParams.get('productId') || '') as ProductId;
    // زیبال گاهی query را نگه می‌دارد؛ اگر نبود، رفتار وب‌پسند (برگشت به سایت)
    const fromParam = url.searchParams.get('from');
    const fromWeb = fromParam === 'web' || fromParam !== 'app';
    const zibalSuccess = url.searchParams.get('success');
    logger.info('Payment callback received', {
      trackId,
      productId,
      from: fromParam || 'app',
      success: zibalSuccess,
      status: url.searchParams.get('status'),
    });

    const callbackStatus = url.searchParams.get('status');
    if (isUserCanceledCallback(zibalSuccess, callbackStatus)) {
      logger.info('Payment callback canceled by user/gateway', {
        trackId,
        productId,
        success: zibalSuccess,
        status: callbackStatus,
      });
      return page('ناموفق', 'پرداخت لغو شد یا انجام نشد.', false, fromWeb);
    }

    if (!trackId) {
      return page('خطا', 'اطلاعات پرداخت ناقص است.', false, fromWeb);
    }

    const found = db
      .select()
      .from(purchases)
      .where(eq(purchases.authority, trackId))
      .limit(1)
      .all();
    const purchase = found[0];
    if (!purchase) {
      return page('یافت نشد', 'تراکنش پیدا نشد.', false, fromWeb);
    }

    const purchaseProductId = purchase.productId as ProductId;
    if (!(purchaseProductId in PRODUCTS)) {
      logger.error('Purchase references unknown product', {
        purchaseId: purchase.id,
        productId: purchase.productId,
      });
      return page('خطا', 'محصول تراکنش نامعتبر است.', false, fromWeb);
    }

    // Never trust productId from the callback URL. The product is immutable on
    // the server-side purchase row created before redirecting to the gateway.
    if (productId && productId !== purchaseProductId) {
      logger.warn('Payment callback product mismatch', {
        purchaseId: purchase.id,
        callbackProductId: productId,
        purchaseProductId,
      });
    }
    productId = purchaseProductId;
    const product = PRODUCTS[productId];
    if (!product) {
      return page('خطا', 'محصول نامعتبر است.', false, fromWeb);
    }

    if (purchase.status === 'completed') {
      return page('پرداخت موفق', `${product.name} قبلاً فعال شده است.`, true, fromWeb);
    }

    let finalRefNumber = '';
    const merchant = process.env.ZIBAL_MERCHANT_ID || process.env.ZIBAL_MERCHANT;
    if (isMockAuthority(trackId) || (!merchant && process.env.NODE_ENV !== 'production')) {
      finalRefNumber = `MOCK-${Date.now()}`;
    } else {
      if (!merchant) {
        return page('خطا', 'پیکربندی درگاه ناقص است (ZIBAL_MERCHANT).', false, fromWeb);
      }
      try {
        const data = await verifyZibalPayment(trackId);
        if (data.result !== 100 && data.result !== 201) {
          db.update(purchases)
            .set({ status: 'failed', updatedAt: new Date() })
            .where(eq(purchases.id, purchase.id))
            .run();
          logger.warn('Zibal verify rejected', {
            trackId,
            result: data.result,
            message: data.message,
          });
          return page('ناموفق', 'پرداخت تأیید نشد.', false, fromWeb);
        }

        // Zibal normally returns the verified amount for result 100.
        // For result 201 (already verified), some responses omit amount/orderId.
        // The callback trackId is already bound to this pending purchase, so do not
        // reject a legitimate retry merely because Zibal omitted those fields.
        if (data.result === 100) {
          if (
            data.amountRial == null ||
            !amountsMatchTomanAndRial(Number(purchase.amount), Number(data.amountRial))
          ) {
            logger.error('Zibal amount mismatch', {
              purchaseId: purchase.id,
              expectedToman: purchase.amount,
              gatewayAmountRial: data.amountRial,
              trackId,
            });
            db.update(purchases)
              .set({ status: 'failed', updatedAt: new Date() })
              .where(eq(purchases.id, purchase.id))
              .run();
            return page('ناموفق', 'مبلغ پرداخت با سفارش مطابقت ندارد.', false, fromWeb);
          }
        } else {
          logger.info('Zibal payment already verified; accepting idempotent callback', {
            purchaseId: purchase.id,
            trackId,
            result: data.result,
          });
        }

        // Bind the gateway transaction to our own order whenever Zibal returns it.
        if (data.orderId && data.orderId !== purchaseOrderId(purchase.id)) {
          logger.error('Zibal orderId mismatch', {
            purchaseId: purchase.id,
            expectedOrderId: purchaseOrderId(purchase.id),
            gatewayOrderId: data.orderId,
          });
          return page('ناموفق', 'شناسه سفارش با تراکنش مطابقت ندارد.', false, fromWeb);
        }

        finalRefNumber = String(data.refNumber || '');
      } catch (e) {
        logger.error('Zibal verify error', {
          trackId,
          message: e instanceof Error ? e.message : String(e),
          stack: e instanceof Error ? e.stack : undefined,
        });
        return page('خطا', 'ارتباط با درگاه برقرار نشد.', false, fromWeb);
      }
    }

    const claimed = db.transaction((tx) => {
      const rows = tx
        .update(purchases)
        .set({ status: 'completed', refId: finalRefNumber, updatedAt: new Date() })
        .where(and(eq(purchases.id, purchase.id), eq(purchases.status, 'pending')))
        .returning({ id: purchases.id })
        .all();
      if (rows.length === 0) return [];
      grantProduct(tx, purchase.userId, product);
      creditReferrerCommission(tx, purchase.userId, purchase.amount);
      try {
        applyGaragePromoAfterPayment(tx, purchase);
      } catch (promoErr) {
        logger.error('Garage promo after payment failed (non-blocking)', {
          purchaseId: purchase.id,
          message: promoErr instanceof Error ? promoErr.message : String(promoErr),
        });
      }
      return rows;
    });

    if (claimed.length === 0) {
      return page('پرداخت موفق', `${product.name} قبلاً به حساب اضافه شده است.`, true, fromWeb);
    }

    try {
      db.insert(analyticsEvents)
        .values({
          event: 'pay_success',
          userId: purchase.userId,
          path: '/api/purchase/verify',
          props: { productId, amount: purchase.amount, trackId },
        })
        .run();
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
    logger.error('Verify Route Error:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return page('خطای سیستمی', 'مشکلی رخ داد.', false, true);
  }
}
