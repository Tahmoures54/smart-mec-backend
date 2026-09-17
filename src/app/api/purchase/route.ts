import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { purchases, garages } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getUserFromRequest } from '@/lib/auth';
import { validateProductId } from '@/lib/validation';
import { handleError } from '@/lib/error-handler';
import { RateLimiter } from '@/lib/rate-limiter';
import { PRODUCTS } from '@/types';
import { logger } from '@/utils/logger';
import {
  allowMockPayments,
  getZibalPaymentMode,
  purchaseOrderId,
  requestZibalPayment,
  startPaymentUrl,
  ZibalError,
} from '@/lib/zibal';

export async function POST(request: NextRequest) {
  try {
    const ip = RateLimiter.getIP(request);
    RateLimiter.check(ip, 'create_purchase', 10, 15 * 60 * 1000);

    const user = await getUserFromRequest(request);

    const body = await request.json();
    const productId = validateProductId(body.productId);
    const product = PRODUCTS[productId];
    const fromWeb = body.from === 'web';
    const webQuery = fromWeb ? '&from=web' : '';
    const isGaragePromo =
      productId === 'garage_silver_30' || productId === 'garage_gold_30';
    const garageIdRaw = body.garageId != null ? Number(body.garageId) : NaN;
    const garageId =
      Number.isFinite(garageIdRaw) && garageIdRaw > 0 ? garageIdRaw : null;
    if (isGaragePromo && !garageId) {
      return NextResponse.json(
        { success: false, error: 'برای پکیج معرفی تعمیرگاه، garageId الزامی است' },
        { status: 400 }
      );
    }

    if (isGaragePromo && garageId) {
      const owned = await db
        .select()
        .from(garages)
        .where(eq(garages.id, garageId))
        .limit(1);
      const g = owned[0];
      if (!g || g.ownerUserId !== user.id) {
        return NextResponse.json(
          { success: false, error: 'تعمیرگاه یافت نشد یا متعلق به شما نیست' },
          { status: 403 }
        );
      }
      await db
        .update(garages)
        .set({ chatStatus: 'pending_payment', updatedAt: new Date() })
        .where(eq(garages.id, garageId));
    }

    const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    const inserted = await db
      .insert(purchases)
      .values({
        userId: user.id,
        productId: product.id,
        amount: product.price,
        status: 'pending',
        garageId,
      })
      .returning({ id: purchases.id });
    const purchaseId = inserted[0]?.id;
    if (!purchaseId) {
      return NextResponse.json(
        { success: false, error: 'ثبت تراکنش ناموفق بود' },
        { status: 500 }
      );
    }

    const orderId = purchaseOrderId(purchaseId);

    if (allowMockPayments()) {
      logger.info('Creating MOCK payment (ZIBAL_MERCHANT not set, non-production)...');
      const authority = 'MOCK_' + Math.random().toString(36).substring(2, 10).toUpperCase();
      await db
        .update(purchases)
        .set({ authority, updatedAt: new Date() })
        .where(eq(purchases.id, purchaseId));

      return NextResponse.json({
        success: true,
        paymentUrl: `${appUrl}/api/purchase/verify?trackId=${authority}&productId=${productId}&success=1&status=2&orderId=${orderId}${webQuery}`,
        mock: true,
        orderId,
      });
    }

    const callbackUrl = `${appUrl}/api/purchase/verify?productId=${productId}${webQuery}`;

    try {
      const zibal = await requestZibalPayment({
        amountToman: product.price,
        callbackUrl,
        description: `${product.title} — ${orderId}`,
        orderId,
        mobile: user.phone,
      });

      await db
        .update(purchases)
        .set({ authority: zibal.trackId, updatedAt: new Date() })
        .where(eq(purchases.id, purchaseId));

      logger.info(
        `Zibal request ok purchase=${purchaseId} trackId=${zibal.trackId} mode=${getZibalPaymentMode()}`
      );

      return NextResponse.json({
        success: true,
        paymentUrl: startPaymentUrl(zibal.trackId),
        orderId,
      });
    } catch (error) {
      await db
        .update(purchases)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(purchases.id, purchaseId));

      if (error instanceof ZibalError) {
        logger.error('Zibal request failed', { result: error.result, message: error.message });
        return NextResponse.json(
          { success: false, error: error.message || 'خطا در اتصال به درگاه' },
          { status: 502 }
        );
      }
      throw error;
    }
  } catch (error) {
    return handleError(error);
  }
}
