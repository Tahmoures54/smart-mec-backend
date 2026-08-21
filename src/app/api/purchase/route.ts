// ═══════════════════════════════════════════════════════════
// Purchase (Create Payment) Route - Smart-MEC
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

export async function POST(request: NextRequest) {
  try {
    const ip = RateLimiter.getIP(request);
    await RateLimiter.check(ip, 'create_purchase', 10, 15 * 60 * 1000);

    const user = await getUserFromRequest(request);

    const body = await request.json();
    const productId = validateProductId(body.productId);
    const product = PRODUCTS[productId];

    const paypingToken = process.env.PAYPING_TOKEN;
    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    // ─── MOCK (بدون توکن درگاه) ───
    if (!paypingToken) {
      logger.info('Creating MOCK payment...');
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
        paymentUrl: `${appUrl}/api/purchase/verify?code=${authority}&productId=${productId}&refid=MOCK_REF`,
      });
    }

    // ─── PRODUCTION PayPing ───
    const clientRefId = `SM_${user.id}_${Date.now()}`;

    const response = await fetch('https://api.payping.ir/v2/pay', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paypingToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: product.price,
        payerIdentity: user.phone,
        payerName: 'کاربر مکانیک هوشمند',
        returnUrl: `${appUrl}/api/purchase/verify?productId=${productId}`,
        clientRefId,
        description: `خرید ${product.name}`,
      }),
    });

    const payData = await response.json();

    if (!response.ok || !payData.code) {
      logger.error('PayPing create payment error:', payData);
      throw new Error(
        'خطا در ارتباط با درگاه پرداخت. لطفاً دوباره تلاش کنید.'
      );
    }

    await db.insert(purchases).values({
      userId: user.id,
      productId: product.id,
      amount: product.price,
      status: 'pending',
      authority: payData.code,
    });

    return NextResponse.json({
      success: true,
      paymentUrl: `https://api.payping.ir/v2/pay/goto/${payData.code}`,
    });
  } catch (error) {
    return handleError(error);
  }
}
