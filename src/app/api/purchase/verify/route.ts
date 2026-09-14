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
import {
  isZibalConfigured,
  isZibalVerifyPaid,
  parseZibalCallback,
  tomanToRial,
  zibalVerify,
} from '@/lib/zibal';

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

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const callback = parseZibalCallback(url.searchParams);
    const productIdParam = url.searchParams.get('productId') as ProductId | null;
    const refId = url.searchParams.get('refid') || url.searchParams.get('refId');
    const fromWeb = url.searchParams.get('from') === 'web';
    const page = (title: string, message: string, ok: boolean, status = 200) =>
      html(title, message, ok, status, fromWeb);

    const trackId = callback.trackId;
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

    const productId = (productIdParam && productIdParam in PRODUCTS
      ? productIdParam
      : purchase.productId) as ProductId;

    if (!(productId in PRODUCTS)) {
      return page('محصول نامعتبر', 'اطلاعات محصول ارسالی معتبر نیست.', false, 400);
    }

    if (productIdParam && productIdParam !== purchase.productId) {
      return page('محصول نامعتبر', 'محصول با تراکنش مطابقت ندارد.', false, 400);
    }

    const product = PRODUCTS[productId];

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

    let verifiedRef: string | null = refId || (mock ? 'MOCK_REF' : null);

    if (!mock) {
      if (!callback.success) {
        await db
          .update(purchases)
          .set({
            status: 'failed',
            updatedAt: new Date(),
          })
          .where(and(eq(purchases.id, purchase.id), eq(purchases.status, 'pending')));
        return page(
          'پرداخت ناموفق',
          'پرداخت در درگاه بانکی کامل نشد.',
          false,
          402
        );
      }

      if (!isZibalConfigured()) {
        logger.error('Zibal merchant missing while verifying live payment');
        return page(
          'خطای پیکربندی',
          'درگاه پرداخت پیکربندی نشده است.',
          false,
          503
        );
      }

      const verifyData = await zibalVerify(trackId);
      if (!isZibalVerifyPaid(verifyData.result)) {
        await db
          .update(purchases)
          .set({
            status: 'failed',
            refId: verifyData.refNumber != null ? String(verifyData.refNumber) : null,
            updatedAt: new Date(),
          })
          .where(
            and(eq(purchases.id, purchase.id), eq(purchases.status, 'pending'))
          );
        return page(
          'پرداخت ناموفق',
          'تراکنش توسط درگاه بانکی تایید نشد.',
          false,
          402
        );
      }

      if (
        typeof verifyData.amount === 'number' &&
        verifyData.amount !== tomanToRial(purchase.amount)
      ) {
        logger.error('Zibal amount mismatch', {
          expected: tomanToRial(purchase.amount),
          got: verifyData.amount,
        });
        return page(
          'پرداخت ناموفق',
          'مبلغ تراکنش با درگاه مطابقت ندارد. با پشتیبانی تماس بگیرید.',
          false,
          400
        );
      }

      verifiedRef =
        verifyData.refNumber != null ? String(verifyData.refNumber) : trackId;
    }

    const claimed = await db.transaction(async (tx) => {
      const rows = await tx
        .update(purchases)
        .set({
          status: 'completed',
          refId: verifiedRef,
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
      `✅ Payment Success: User ${purchase.userId} bought ${product.name}`
    );
    return page(
      'پرداخت موفق',
      `${product.name} با موفقیت به حساب شما اضافه شد.`,
      true
    );
  } catch (error) {
    logger.error('Verify Route Error:', error);
    return html('خطای سیستمی', 'مشکلی در سیستم رخ داده است.', false, 500);
  }
}
