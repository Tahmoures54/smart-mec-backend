// ═══════════════════════════════════════════════════════════
// Purchase Verify Route - Smart-MEC
// Gateway: Zibal (https://zibal.ir)
// ═══════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { purchases, users } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { PRODUCTS, ProductId } from '@/types';
import { logger } from '@/utils/logger';
import { escapeHtml } from '@/lib/html';
import {
  computeGoldenExpiry,
  computeReferralCommission,
  isMockAuthority,
} from '@/lib/payment';
import { referralPercentage } from '@/lib/constants';

// ─── Zibal Config ───
const ZIBAL_VERIFY_URL =
  process.env.ZIBAL_VERIFY_URL || 'https://gateway.zibal.ir/v1/verify';
const ZIBAL_TIMEOUT_MS = Number(process.env.ZIBAL_TIMEOUT_MS) || 15000;

const renderHTML = (
  title: string,
  message: string,
  isSuccess: boolean,
  fromWeb = false
) => {
  const backHref = fromWeb ? '/diagnose' : isSuccess ? 'smartmec://success' : 'smartmec://failed';
  const backLabel = fromWeb ? 'بازگشت به عیب‌یابی' : 'بازگشت به اپلیکیشن';
  return `
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <style>
        body { font-family: Tahoma, Arial, sans-serif; background-color: #121212; color: #ffffff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .container { background-color: #1e1e1e; padding: 40px; border-radius: 16px; text-align: center; max-width: 400px; width: 90%; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .icon { font-size: 64px; margin-bottom: 20px; }
        .success { color: #4caf50; }
        .error { color: #f44336; }
        h1 { font-size: 24px; margin-bottom: 10px; }
        p { font-size: 16px; color: #aaaaaa; margin-bottom: 30px; line-height: 1.5; }
        .btn { background-color: #ff9800; color: #000; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block; width: 100%; box-sizing: border-box; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon ${isSuccess ? 'success' : 'error'}">${isSuccess ? '✓' : '✗'}</div>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(message)}</p>
        <a href="${backHref}" class="btn">${backLabel}</a>
    </div>
    <script>
        setTimeout(function() {
          window.location.href = '${backHref}';
        }, 1500);
    </script>
</body>
</html>
`;
};

function html(title: string, message: string, ok: boolean, status = 200, fromWeb = false) {
  return new NextResponse(renderHTML(title, message, ok, fromWeb), {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

async function creditReferrerCommission(
  tx: Pick<typeof db, 'query' | 'update'>,
  buyerUserId: number,
  purchaseAmount: number
) {
  const buyer = await tx.query.users.findFirst({
    where: eq(users.id, buyerUserId),
  });
  if (!buyer?.referredBy) return;
  const commission = computeReferralCommission(
    purchaseAmount,
    referralPercentage()
  );
  if (commission <= 0) return;
  await tx
    .update(users)
    .set({
      earnings: sql`${users.earnings} + ${commission}`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, buyer.referredBy));
  logger.info(
    `Referral commission: +${commission} Toman to user ${buyer.referredBy} from buyer ${buyerUserId}`
  );
}

async function grantProduct(
  tx: Pick<typeof db, 'query' | 'update'>,
  userId: number,
  product: (typeof PRODUCTS)[ProductId]
) {
  const user = await tx.query.users.findFirst({
    where: eq(users.id, userId),
  });
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
      .where(eq(users.id, user.id));
    return;
  }

  if (product.credits) {
    await tx
      .update(users)
      .set({
        credits: sql`${users.credits} + ${product.credits}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));
  }
}

// ─── Zibal Verify Helper ───
async function verifyZibalPayment(
  trackId: string
): Promise<{ success: boolean; refNumber?: string; error?: string }> {
  const merchant = process.env.ZIBAL_MERCHANT;
  if (!merchant) {
    return { success: false, error: 'ZIBAL_MERCHANT_CONFIG_MISSING' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ZIBAL_TIMEOUT_MS);

  try {
    const res = await fetch(ZIBAL_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant,
        trackId: Number(trackId),
      }),
      signal: controller.signal,
    });

    const data = await res.json();

    // کد 100 = موفقیت در زیبال
    // کد 201 = تراکنش قبلاً تأیید شده (processed before)
    if (data.result === 100) {
      return { success: true, refNumber: String(data.refNumber || '') };
    }

    if (data.result === 201) {
      // قبلاً verify شده — باز هم موفق در نظر گرفته می‌شود
      return { success: true, refNumber: String(data.refNumber || '') };
    }

    logger.error('Zibal verify failed:', data);
    return {
      success: false,
      error: data.message || `ZIBAL_RESULT_${data.result}`,
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { success: false, error: 'ZIBAL_TIMEOUT' };
    }
    logger.error('Zibal verify fetch error:', err);
    return { success: false, error: 'ZIBAL_NETWORK_ERROR' };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);

    // ─── پارامترهای callback زیبال ───
    // زیبال این پارامترها را برمی‌گرداند:
    // trackId=10000&success=1&status=2&orderId=1
    const trackId =
      url.searchParams.get('trackId') ||
      url.searchParams.get('trackid') ||
      url.searchParams.get('code') ||
      url.searchParams.get('authority');
    const zibalSuccess = url.searchParams.get('success');
    const zibalStatus = url.searchParams.get('status');
    const productId = url.searchParams.get('productId') as ProductId;
    const fromWeb = url.searchParams.get('from') === 'web';

    // refid/refId برای سازگاری با کد قدیمی (mock)
    const refIdParam =
      url.searchParams.get('refid') || url.searchParams.get('refId');

    const page = (title: string, message: string, ok: boolean, status = 200) =>
      html(title, message, ok, status, fromWeb);

    if (!productId || !(productId in PRODUCTS)) {
      return page('محصول نامعتبر', 'اطلاعات محصول ارسالی معتبر نیست.', false, 400);
    }

    const product = PRODUCTS[productId];
    const mock = isMockAuthority(trackId);

    if (!trackId) {
      return page('تراکنش نامعتبر', 'کد رهگیری پرداخت ارسال نشده است.', false, 400);
    }

    const purchase = await db.query.purchases.findFirst({
      where: eq(purchases.authority, trackId),
    });

    if (!purchase) {
      return page(
        'تراکنش منقضی',
        'این تراکنش قبلاً پردازش شده یا یافت نشد.',
        false,
        404
      );
    }

    if (purchase.status === 'completed') {
      return page(
        'پرداخت موفق',
        `${product.name} قبلاً به حساب شما اضافه شده است.`,
        true
      );
    }

    if (purchase.status !== 'pending') {
      return page(
        'تراکنش منقضی',
        'این تراکنش قبلاً پردازش شده یا یافت نشد.',
        false,
        409
      );
    }

    if (purchase.productId !== productId) {
      return page('محصول نامعتبر', 'محصول با تراکنش مطابقت ندارد.', false, 400);
    }

    // ─── بخش تأیید واقعی (غیر MOCK) ───
    let finalRefNumber: string | null = null;

    if (!mock) {
      // بررسی پارامترهای callback زیبال
      if (zibalSuccess !== '1' || zibalStatus !== '2') {
        // کاربر پرداخت را لغو کرده یا تراکنش ناموفق بوده
        await db
          .update(purchases)
          .set({
            status: 'failed',
            refId: refIdParam || null,
            updatedAt: new Date(),
          })
          .where(
            and(eq(purchases.id, purchase.id), eq(purchases.status, 'pending'))
          );
        return page(
          'پرداخت ناموفق',
          'تراکنش توسط درگاه بانکی تایید نشد. اگر مبلغ از حساب شما کم شده با پشتیبانی تماس بگیرید.',
          false,
          402
        );
      }

      // فراخوانی verify زیبال
      const verifyResult = await verifyZibalPayment(trackId);

      if (!verifyResult.success) {
        logger.error(
          `Zibal verify failed for trackId ${trackId}:`,
          verifyResult.error
        );
        await db
          .update(purchases)
          .set({
            status: 'failed',
            refId: refIdParam || null,
            updatedAt: new Date(),
          })
          .where(
            and(eq(purchases.id, purchase.id), eq(purchases.status, 'pending'))
          );

        // پیام خطای متناسب با نوع خطا
        if (verifyResult.error === 'ZIBAL_TIMEOUT') {
          return page(
            'خطا در تأیید پرداخت',
            'زمان پاسخ درگاه به پایان رسید. لطفاً چند دقیقه بعد دوباره بررسی کنید.',
            false,
            504
          );
        }

        if (verifyResult.error === 'ZIBAL_MERCHANT_CONFIG_MISSING') {
          return page(
            'خطای پیکربندی',
            'درگاه پرداخت پیکربندی نشده است.',
            false,
            503
          );
        }

        return page(
          'پرداخت ناموفق',
          'تراکنش توسط درگاه بانکی تایید نشد. اگر مبلغ از حساب شما کم شده با پشتیبانی تماس بگیرید.',
          false,
          402
        );
      }

      finalRefNumber = verifyResult.refNumber || null;
    } else {
      // MOCK mode
      finalRefNumber = refIdParam || 'MOCK_REF';
    }

    // ─── به‌روزرسانی اتمی دیتابیس ───
    const claimed = await db.transaction(async (tx) => {
      const rows = await tx
        .update(purchases)
        .set({
          status: 'completed',
          refId: finalRefNumber,
          updatedAt: new Date(),
        })
        .where(and(eq(purchases.id, purchase.id), eq(purchases.status, 'pending')))
        .returning({ id: purchases.id });

      if (rows.length === 0) {
        return [];
      }

      await grantProduct(tx, purchase.userId, product);
      await creditReferrerCommission(tx, purchase.userId, purchase.amount);
      return rows;
    });

    if (claimed.length === 0) {
      return page(
        'پرداخت موفق',
        `${product.name} قبلاً به حساب شما اضافه شده است.`,
        true
      );
    }

    logger.info(
      `✅ Payment Success (Zibal): User ${purchase.userId} bought ${product.name} | trackId: ${trackId} | refNumber: ${finalRefNumber}`
    );

    return page(
      'پرداخت موفق',
      `${product.name} با موفقیت به حساب شما اضافه شد.${
        finalRefNumber ? ` کد رهگیری: ${escapeHtml(finalRefNumber)}` : ''
      }`,
      true
    );
  } catch (error) {
    logger.error('Verify Route Error:', error);
    return html('خطای سیستمی', 'مشکلی در سیستم رخ داده است.', false, 500);
  }
}
