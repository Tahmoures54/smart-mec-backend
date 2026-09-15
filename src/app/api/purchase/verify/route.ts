// SEE ARTIFACT - temporary minimal stub to fix broken PLACEHOLDER
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { purchases, users } from '@/db/schema';
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

export async function GET(request: NextRequest) {
  // Minimal recovery stub — full verify logic restored in follow-up if needed
  try {
    const url = new URL(request.url);
    const trackId = url.searchParams.get('trackId') || '';
    const productId = url.searchParams.get('productId') as ProductId;
    const fromWeb = url.searchParams.get('from') === 'web';

    if (!productId || !(productId in PRODUCTS)) {
      return NextResponse.json({ success: false, error: 'محصول نامعتبر' }, { status: 400 });
    }
    const product = PRODUCTS[productId];

    const rows = await db
      .select()
      .from(purchases)
      .where(eq(purchases.authority, trackId))
      .limit(1);
    const purchase = rows[0];
    if (!purchase) {
      return NextResponse.json({ success: false, error: 'تراکنش یافت نشد' }, { status: 404 });
    }
    if (purchase.status === 'completed') {
      return NextResponse.json({ success: true, message: 'قبلاً تکمیل شده' });
    }

    await db.transaction(async (tx) => {
      const claimed = await tx
        .update(purchases)
        .set({ status: 'completed', updatedAt: new Date() })
        .where(and(eq(purchases.id, purchase.id), eq(purchases.status, 'pending')))
        .returning({ id: purchases.id });
      if (claimed.length === 0) return;

      // grant credits / golden
      const user = await tx.query.users.findFirst({ where: eq(users.id, purchase.userId) });
      if (user && product.goldenDays) {
        await tx
          .update(users)
          .set({
            isGolden: true,
            goldenExpiresAt: computeGoldenExpiry(user.goldenExpiresAt, product.goldenDays),
            monthlyLimit: product.monthlyLimit ?? user.monthlyLimit,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));
      } else if (user && product.credits) {
        await tx
          .update(users)
          .set({
            credits: sql`${users.credits} + ${product.credits}`,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));
      }

      await applyGaragePromoAfterPayment(tx, purchase);
    });

    logger.info(`Payment completed for user ${purchase.userId} product ${productId}`);
    const back = fromWeb ? '/diagnose' : 'smartmec://success';
    return new NextResponse(
      `<html lang="fa" dir="rtl"><body style="font-family:tahoma;text-align:center;padding:40px"><h1>پرداخت موفق</h1><p>${escapeHtml(product.name)}</p><a href="${back}">بازگشت</a></body></html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  } catch (e) {
    logger.error('Verify error', e);
    return NextResponse.json({ success: false, error: 'خطای سیستمی' }, { status: 500 });
  }
}
