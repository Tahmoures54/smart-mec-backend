// ═══════════════════════════════════════════════════════════
// Purchase (Create Payment) Route - Smart-MEC (Zibal)
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
    RateLimiter.check(ip, 'create_purchase', 10, 15 * 60 * 1000);

    const user = await getUserFromRequest(request);

    const body = await request.json();
    const productId = validateProductId(body.productId);
    const product = PRODUCTS[productId];
    const fromWeb = body.from === 'web';
    const webQuery = fromWeb ? '&from=web' : '';

    const zibalMerchant = process.env.ZIBAL_MERCHANT;
    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    // ─── MOCK (بدون کد مرچنت درگاه) ───
    if (!zibalMerchant) {
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
        paymentUrl: `${appUrl}/api/purchase/verify?trackId=${authority}&productId=${productId}&success=1&status=2&refid=MOCK_REF${webQuery}`,
      });
    }

    // ─── PRODUCTION Zibal ───
    const callbackUrl = `${appUrl}/api/purchase/verify?productId=${productId}${webQuery}`;

    const zibalResponse = await fetch('https://gateway.zibal.ir/v1/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        merchant: zibalMerchant,      // کد مرچنت از پنل زیبال
        amount: product.price,         // مبلغ به ریال
        callbackUrl: callbackUrl,      // آدرس بازگشت
        mobile: user.phone,            // اختیاری - شماره موبایل کاربر
        description: `خرید ${product.name}`, // اختیاری
      }),
    });

    const zibalData = await zibalResponse.json();

    // بررسی کد موفقیت (result === 100)
    if (!zibalResponse.ok || zibalData.result !== 100) {
      logger.error('Zibal create payment error:', zibalData);
      throw new Error(
        'خطا در ارتباط با درگاه پرداخت. لطفاً دوباره تلاش کنید.'
      );
    }

    // ذخیره trackId به عنوان authority در دیتابیس
    await db.insert(purchases).values({
      userId: user.id,
      productId: product.id,
      amount: product.price,
      status: 'pending',
      authority: String(zibalData.trackId),
    });

    // لینک هدایت کاربر به درگاه زیبال
    return NextResponse.json({
      success: true,
      paymentUrl: `https://gateway.zibal.ir/start/${zibalData.trackId}`,
    });
  } catch (error) {
    return handleError(error);
  }
}
