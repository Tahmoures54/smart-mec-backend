// ═══════════════════════════════════════════════════════════
// Purchase (Create Payment) Route - Smart-MEC — درگاه زیبال
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { purchases } from '@/db/schema';
import { getUserFromRequest } from '@/lib/auth';
import { validateProductId } from '@/lib/validation';
import { handleError } from '@/lib/error-handler';
import { RateLimiter } from '@/lib/rate-limiter';
import { PRODUCTS } from '@/types';
import { logger } from '@/utils/logger';
import {
  isZibalConfigured,
  tomanToRial,
  zibalRequest,
  zibalStartUrl,
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

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const callbackUrl = `${appUrl}/api/purchase/verify?productId=${productId}${webQuery}`;

    if (!isZibalConfigured()) {
      logger.info('Creating MOCK payment (ZIBAL_MERCHANT is empty)...');
      const authority =
        'MOCK_' + Math.random().toString(36).substring(2, 10).toUpperCase();

      await db.insert(purchases).values({
        userId: user.id,
        productId: product.id,
        amount: product.price,
        status: 'pending',
        authority,
      });

      return NextResponse.json({
        success: true,
        paymentUrl: `${callbackUrl}&code=${authority}&refid=MOCK_REF`,
      });
    }

    const orderId = `SM_${productId}_${user.id}_${Date.now()}`;
    const payData = await zibalRequest({
      amountRial: tomanToRial(product.price),
      callbackUrl,
      description: `خرید ${product.name}`,
      orderId,
      mobile: user.phone,
    });

    if (payData.result !== 100 || !payData.trackId) {
      logger.error('Zibal create payment error:', payData);
      throw new Error('خطا در ارتباط با درگاه پرداخت. لطفاً دوباره تلاش کنید.');
    }

    const authority = String(payData.trackId);

    await db.insert(purchases).values({
      userId: user.id,
      productId: product.id,
      amount: product.price,
      status: 'pending',
      authority,
    });

    return NextResponse.json({
      success: true,
      paymentUrl: zibalStartUrl(authority),
    });
  } catch (error) {
    return handleError(error);
  }
}
