// ═══════════════════════════════════════════════════════════
// Purchase (Create Payment) Route - Smart-MEC
// Gateway: Zibal (https://zibal.ir)
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

// ─── Zibal Config ───
const ZIBAL_REQUEST_URL =
  process.env.ZIBAL_REQUEST_URL || 'https://gateway.zibal.ir/v1/request';
const ZIBAL_START_URL =
  process.env.ZIBAL_START_URL || 'https://gateway.zibal.ir/start';
const ZIBAL_TIMEOUT_MS = Number(process.env.ZIBAL_TIMEOUT_MS) || 15000;

// قیمت‌ها در PRODUCTS به تومان هستند؛ زیبال فقط ریال می‌پذیرد.
const TOMAN_TO_RIAL = 10;

export async function POST(request: NextRequest) {
  try {
    // ─── Rate Limit ───
    const ip = RateLimiter.getIP(request);
    RateLimiter.check(ip, 'create_purchase', 10, 15 * 60 * 1000);

    // ─── Auth ───
    const user = await getUserFromRequest(request);

    // ─── Body ───
    const body = await request.json();
    const productId = validateProductId(body.productId);
    const product = PRODUCTS[productId];
    const fromWeb = body.from === 'web';
    const webQuery = fromWeb ? '&from=web' : '';

    // ─── Env ───
    const zibalMerchant = process.env.ZIBAL_MERCHANT;
    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    // ─────────────────────────────────────────────────────
    // MOCK MODE (بدون کد مرچنت درگاه)
    // ─────────────────────────────────────────────────────
    if (!zibalMerchant) {
      logger.info('Creating MOCK payment (ZIBAL_MERCHANT not set)...');

      const authority =
        'MOCK_' + Math.random().toString(36).substring(2, 10).toUpperCase();

      await db.insert(purchases).values({
        userId: user.id,
        productId: product.id,
        amount: product.price, // تومان
        status: 'pending',
        authority,
      });

      const mockVerifyUrl = `${appUrl}/api/purchase/verify?trackId=${authority}&productId=${productId}&success=1&status=2&refid=MOCK_REF${webQuery}`;

      return NextResponse.json({
        success: true,
        paymentUrl: mockVerifyUrl,
        mock: true,
      });
    }

    // ─────────────────────────────────────────────────────
    // PRODUCTION — Zibal Request
    // ─────────────────────────────────────────────────────
    const callbackUrl = `${appUrl}/api/purchase/verify?productId=${productId}${webQuery}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ZIBAL_TIMEOUT_MS);

    let zibalResponse: Response;
    try {
      zibalResponse = await fetch(ZIBAL_REQUEST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant: zibalMerchant,               // کد مرچنت زیبال (یا zibal برای sandbox)
          amount: product.price * TOMAN_TO_RIAL, // ← تبدیل تومان به ریال
          callbackUrl,                           // آدرس بازگشت پس از پرداخت
          mobile: user.phone,                    // اختیاری
          description: `خرید ${product.name}`,   // اختیاری
        }),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        logger.error('Zibal request timeout');
        throw new Error('زمان پاسخ درگاه پرداخت به پایان رسید. لطفاً دوباره تلاش کنید.');
      }
      logger.error('Zibal fetch error:', err);
      throw new Error('خطا در ارتباط با درگاه پرداخت. لطفاً دوباره تلاش کنید.');
    } finally {
      clearTimeout(timeout);
    }

    // ─── Parse Response ───
    let zibalData: { result?: number; trackId?: number; message?: string };
    try {
      zibalData = await zibalResponse.json();
    } catch (err) {
      logger.error('Zibal invalid JSON response:', err);
      throw new Error('پاسخ نامعتبر از درگاه پرداخت دریافت شد.');
    }

    // کد 100 = موفقیت در زیبال
    if (!zibalResponse.ok || zibalData.result !== 100 || !zibalData.trackId) {
      logger.error('Zibal create payment error:', zibalData);
      throw new Error(
        'خطا در ارتباط با درگاه پرداخت. لطفاً دوباره تلاش کنید.'
      );
    }

    // ─── ذخیره در دیتابیس (مبلغ به تومان) ───
    await db.insert(purchases).values({
      userId: user.id,
      productId: product.id,
      amount: product.price, // تومان — نه ریال
      status: 'pending',
      authority: String(zibalData.trackId),
    });

    // ─── لینک هدایت کاربر به درگاه زیبال ───
    return NextResponse.json({
      success: true,
      paymentUrl: `${ZIBAL_START_URL}/${zibalData.trackId}`,
      trackId: zibalData.trackId,
    });
  } catch (error) {
    return handleError(error);
  }
}
