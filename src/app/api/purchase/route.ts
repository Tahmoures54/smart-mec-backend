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

const ZIBAL_REQUEST_URL = 'https://gateway.zibal.ir/v1/request';
const ZIBAL_TIMEOUT_MS = 15000;
const TOMAN_TO_RIAL = 10;

/** پشتیبانی از هر دو نام متغیر محیطی برای سازگاری با پنل لیارا / .env قدیمی */
function getZibalMerchant(): string | undefined {
  return process.env.ZIBAL_MERCHANT_ID || process.env.ZIBAL_MERCHANT || undefined;
}

interface ZibalRequestResponse {
  result: number;
  trackId?: number;
  message?: string;
}

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

    const zibalMerchant = getZibalMerchant();
    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    if (!zibalMerchant) {
      logger.info('Creating MOCK payment (ZIBAL_MERCHANT / ZIBAL_MERCHANT_ID not set)...');

      const authority =
        'MOCK_' + Math.random().toString(36).substring(2, 10).toUpperCase();

      await db.insert(purchases).values({
        userId: user.id,
        productId: product.id,
        amount: product.price,
        status: 'pending',
        authority,
        garageId: garageId,
      });

      const mockVerifyUrl = `${appUrl}/api/purchase/verify?trackId=${authority}&productId=${productId}&success=1&status=2&refid=MOCK_REF${webQuery}`;

      return NextResponse.json({
        success: true,
        paymentUrl: mockVerifyUrl,
        mock: true,
      });
    }

    const callbackUrl = `${appUrl}/api/purchase/verify?productId=${productId}${webQuery}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ZIBAL_TIMEOUT_MS);

    let zibalResponse: Response;
    try {
      zibalResponse = await fetch(ZIBAL_REQUEST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant: zibalMerchant,
          amount: product.price * TOMAN_TO_RIAL,
          callbackUrl,
          description: product.title,
          orderId: String(user.id),
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const zibalData = (await zibalResponse.json()) as ZibalRequestResponse;
    if (zibalData.result !== 100 || !zibalData.trackId) {
      logger.error('Zibal request failed', zibalData);
      return NextResponse.json(
        { success: false, error: zibalData.message || 'خطا در اتصال به درگاه' },
        { status: 502 }
      );
    }

    await db.insert(purchases).values({
      userId: user.id,
      productId: product.id,
      amount: product.price,
      status: 'pending',
      authority: String(zibalData.trackId),
      garageId: garageId,
    });

    return NextResponse.json({
      success: true,
      paymentUrl: `https://gateway.zibal.ir/start/${zibalData.trackId}`,
    });
  } catch (error) {
    return handleError(error);
  }
}
