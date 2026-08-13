// ═══════════════════════════════════════════════════════════
// Purchase Verify Route - Smart-MEC
// + کمیسیون رفرال بعد از پرداخت موفق
// ═══════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { purchases, users } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { PRODUCTS, ProductId } from '@/types';
import { logger } from '@/utils/logger';
const renderHTML = (
  title: string,
  message: string,
  isSuccess: boolean
) => `
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
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
        <h1>${title}</h1>
        <p>${message}</p>
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
/** واریز کمیسیون به حساب معرف */
async function creditReferrerCommission(
  buyerUserId: number,
  purchaseAmount: number
) {
  try {
    const buyer = await db.query.users.findFirst({
      where: eq(users.id, buyerUserId),
    });
    if (!buyer?.referredBy) return;
    const percentage = parseInt(process.env.REFERRAL_PERCENTAGE || '10', 10);
    if (!percentage || percentage <= 0) return;
    const commission = Math.floor((purchaseAmount * percentage) / 100);
    if (commission <= 0) return;
    await db
      .update(users)
      .set({
        earnings: sql`${users.earnings} + ${commission}`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, buyer.referredBy));
    logger.info(
      `Referral commission: +${commission} Toman to user ${buyer.referredBy} from buyer ${buyerUserId}`
    );
  } catch (err) {
    logger.error('Failed to credit referral commission', err);
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
      return new NextResponse(
        renderHTML('محصول نامعتبر', 'اطلاعات محصول ارسالی معتبر نیست.', false),
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }
    const product = PRODUCTS[productId];
    const paypingToken = process.env.PAYPING_TOKEN;
    let purchase: Awaited<
      ReturnType<typeof db.query.purchases.findFirst>
    > | null = null;
    if (code) {
      purchase = await db.query.purchases.findFirst({
        where: and(
          eq(purchases.authority, code),
          eq(purchases.status, 'pending')
        ),
      });
    }
    if (!purchase && code?.startsWith('MOCK_')) {
      purchase = await db.query.purchases.findFirst({
        where: and(
          eq(purchases.authority, code),
          eq(purchases.status, 'pending')
        ),
      });
    }
    if (!purchase || purchase.status !== 'pending') {
      return new NextResponse(
        renderHTML(
          'تراکنش منقضی',
          'این تراکنش قبلاً پردازش شده یا یافت نشد.',
          false
        ),
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }
    if (
      paypingToken &&
      refId &&
      refId !== 'MOCK_REF' &&
      !String(code).startsWith('MOCK_')
    ) {
      const verifyRes = await fetch(`https://api.payping.ir/v2/pay/verify`, {
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
            updatedAt: new Date().toISOString(),
          })
          .where(eq(purchases.id, purchase.id));
        return new NextResponse(
          renderHTML(
            'پرداخت ناموفق',
            'تراکنش توسط درگاه بانکی تایید نشد.',
            false
          ),
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
    }
    await db
      .update(purchases)
      .set({
        status: 'completed',
        refId: refId || 'MOCK_REF',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(purchases.id, purchase.id));
    const user = await db.query.users.findFirst({
      where: eq(users.id, purchase.userId),
    });
    if (user) {
      if (product.goldenDays) {
        const now = Date.now();
        let baseDate = user.goldenExpiresAt
          ? new Date(user.goldenExpiresAt).getTime()
          : now;
        if (baseDate < now) baseDate = now;
        const newExpiryDate = new Date(
          baseDate + product.goldenDays * 24 * 60 * 60 * 1000
        ).toISOString();
        await db
          .update(users)
          .set({
            isGolden: true,
            goldenExpiresAt: newExpiryDate,
            monthlyLimit: product.monthlyLimit ?? user.monthlyLimit,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(users.id, user.id));
      } else if (product.credits) {
        await db
          .update(users)
          .set({
            credits: user.credits + (product.credits || 0),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(users.id, user.id));
      }
      // کمیسیون رفرال
      await creditReferrerCommission(user.id, purchase.amount);
    }
    logger.info(
      `✅ Payment Success: User ${purchase.userId} bought ${product.name}`
    );
    return new NextResponse(
      renderHTML(
        'پرداخت موفق',
        `${product.name} با موفقیت به حساب شما اضافه شد.`,
        true
      ),
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  } catch (error) {
    logger.error('Verify Route Error:', error);
    return new NextResponse(
      renderHTML('خطای سیستمی', 'مشکلی در سیستم رخ داده است.', false),
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}
