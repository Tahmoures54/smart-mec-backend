// ═══════════════════════════════════════════════════════════
// User Profile / Credits / Referral Stats - Smart-MEC (Optimized)
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, monthlyFreeUsage } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getUserFromRequest } from '@/lib/auth';
import { handleError, BadRequestError } from '@/lib/error-handler';
import { logger } from '@/utils/logger';

// ⚙️ خواندن تنظیمات محیطی یک بار در زمان بارگذاری ماژول
const REFERRAL_PERCENTAGE = parseInt(process.env.REFERRAL_PERCENTAGE || '10', 10);
const MIN_WITHDRAWAL = parseInt(process.env.MIN_WITHDRAWAL || '50000', 10);
const MONTHLY_FREE_LIMIT = parseInt(process.env.MONTHLY_FREE_LIMIT || '2', 10);

export async function GET(request: NextRequest) {
  try {
    // ─── احراز هویت و بررسی وجود کاربر ───
    const user = await getUserFromRequest(request);
    if (!user) {
      throw new BadRequestError('کاربر یافت نشد یا نشست شما به پایان رسیده است.');
    }

    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);

    // ─── محاسبه تعداد دعوت‌ها ───
    // استفاده از count(*) برای شمارش ردیف‌ها
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.referredBy, user.id));

    const referredCount = Number(countResult[0]?.count ?? 0);

    // ─── دریافت سهمیه رایگان ماهانه ───
    const freeUsage = await db.query.monthlyFreeUsage.findFirst({
      where: and(
        eq(monthlyFreeUsage.userId, user.id),
        eq(monthlyFreeUsage.yearMonth, currentMonth)
      ),
    });

    const usedFree = freeUsage?.freeCount ?? 0;
    const remainingFree = Math.max(0, MONTHLY_FREE_LIMIT - usedFree);

    // ─── لاگ‌گذاری برای دیباگ (اختیاری) ───
    logger.info('User profile fetched', { 
      userId: user.id, 
      referredCount 
    });

    // ─── پاسخ به کلاینت ───
    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        phone: user.phone,
        credits: user.credits,
        isGolden: user.isGolden,
        goldenExpiresAt: user.goldenExpiresAt,
        referralCode: user.referralCode,
        earnings: user.earnings ?? 0,
        // اطلاعات سیستم دعوت
        referredCount,
        referralPercentage: REFERRAL_PERCENTAGE,
        minWithdrawal: MIN_WITHDRAWAL,
        // اطلاعات سهمیه رایگان
        monthlyFreeLimit: MONTHLY_FREE_LIMIT,
        usedFree,
        remainingFree,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
