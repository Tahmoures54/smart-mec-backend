// ═══════════════════════════════════════════════════════════
// Purchase Verify Route - Smart-MEC
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

const renderHTML = (title: string, message: string, isSuccess: boolean) => `
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
        <a href="${isSuccess ? 'smartmec://success' : 'smartmec://failed'}" class="btn">بازگشت به اپلیکیشن</a>
    </div>
    <script>
        setTimeout(function() {
          window.location.href = '${isSuccess ? 'smartmec://success' : 'smartmec://failed'}';
        }, 1500);
    </script>
</body>
</html>
`;

function html(title: string, message: string, ok: boolean, status = 200) {
  return new NextResponse(renderHTML(title, message, ok), {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

async function creditReferrerCommission(buyerUserId: number, purchaseAmount: number) {
  try {
    const buyer = await db.query.users.findFirst({
      where: eq(users.id, buyerUserId),
    });
    if (!buyer?.referredBy) return;
    const commission = computeReferralCommission(
      purchaseAmount,
      referralPercentage()
    );
    if (commission <= 0) return;
    await db
      .update(users)
      .set({
        earnings: sql`${users.earnings} + ${commission}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, buyer.referredBy));
    logger.info(
      `Referral commission: +${commission} Toman to user ${buyer.referredBy} from buyer ${buyerUserId}`
    );
  } catch (err) {
    logger.error('Failed to credit referral commission', err);
  }
}

async function grantProduct(userId: number, product: (typeof PRODUCTS)[ProductId]) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!user) return;

  if (product.goldenDays) {
    await db
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
    await db
      .update(users)
      .set({
        credits: sql`${users.credits} + ${product.credits}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const refId =
      url.searchParams.get('refid') ||
      url.searchParams.get('refId') ||
      url.searchParams.get('Authority');
    const productId = url.searchParams.get('productId') as ProductId;
    const code =
      url.searchParams.get('code') ||
      url.searchParams.get('authority') ||
      url.searchParams.get('Authority');

    if (!productId || !(productId in PRODUCTS)) {
      return html('محصول نامعتبر', 'اطلاعات محصول ارسالی معتبر نیست.', false, 400);
    }

    const product = PRODUCTS[productId];
    const paypingToken = process.env.PAYPING_TOKEN;
    const mock = isMockAuthority(code);

    if (!code) {
      return html('تراکنش نامعتبر', 'کد رهگیری پرداخت ارسال نشده است.', false, 400);
    }

    const purchase = await db.query.purchases.findFirst({
      where: eq(purchases.authority, code),
    });

    if (!purchase) {
      return html(
        'تراکنش منقضی',
        'این تراکنش قبلاً پردازش شده یا یافت نشد.',
        false,
        404
      );
    }

    if (purchase.status === 'completed') {
      return html(
        'پرداخت موفق',
        `${product.name} قبلاً به حساب شما اضافه شده است.`,
        true
      );
    }

    if (purchase.status !== 'pending') {
      return html(
        'تراکنش منقضی',
        'این تراکنش قبلاً پردازش شده یا یافت نشد.',
        false,
        409
      );
    }

    if (purchase.productId !== productId) {
      return html('محصول نامعتبر', 'محصول با تراکنش مطابقت ندارد.', false, 400);
    }

    if (!mock) {
      if (!paypingToken) {
        logger.error('PayPing token missing while verifying live payment');
        return html(
          'خطای پیکربندی',
          'درگاه پرداخت پیکربندی نشده است.',
          false,
          503
        );
      }
      if (!refId) {
        return html(
          'پرداخت ناموفق',
          'رسید درگاه دریافت نشد. اگر مبلغ از حساب شما کم شده با پشتیبانی تماس بگیرید.',
          false,
          400
        );
      }

      const verifyRes = await fetch('https://api.payping.ir/v2/pay/verify', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${paypingToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refId, amount: purchase.amount }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || verifyData.status !== 200) {
        await db
          .update(purchases)
          .set({
            status: 'failed',
            refId: refId || null,
            updatedAt: new Date(),
          })
          .where(
            and(eq(purchases.id, purchase.id), eq(purchases.status, 'pending'))
          );
        return html(
          'پرداخت ناموفق',
          'تراکنش توسط درگاه بانکی تایید نشد.',
          false,
          402
        );
      }
    }

    const claimed = await db
      .update(purchases)
      .set({
        status: 'completed',
        refId: refId || (mock ? 'MOCK_REF' : null),
        updatedAt: new Date(),
      })
      .where(and(eq(purchases.id, purchase.id), eq(purchases.status, 'pending')))
      .returning({ id: purchases.id });

    if (claimed.length === 0) {
      return html(
        'پرداخت موفق',
        `${product.name} قبلاً به حساب شما اضافه شده است.`,
        true
      );
    }

    await grantProduct(purchase.userId, product);
    await creditReferrerCommission(purchase.userId, purchase.amount);

    logger.info(
      `✅ Payment Success: User ${purchase.userId} bought ${product.name}`
    );
    return html(
      'پرداخت موفق',
      `${product.name} با موفقیت به حساب شما اضافه شد.`,
      true
    );
  } catch (error) {
    logger.error('Verify Route Error:', error);
    return html('خطای سیستمی', 'مشکلی در سیستم رخ داده است.', false, 500);
  }
}
