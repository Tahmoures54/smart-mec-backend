// ═══════════════════════════════════════════════════════════
// User Profile / Credits / Referral Stats - Smart-MEC
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, monthlyFreeUsage } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getUserFromRequest } from '@/lib/auth';
import { handleError } from '@/lib/error-handler';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);

    // تعداد کاربرانی که با کد این کاربر ثبت‌نام کرده‌اند
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.referredBy, user.id));

    const referredCount = Number(countResult[0]?.count ?? 0);
    const referralPercentage = parseInt(
      process.env.REFERRAL_PERCENTAGE || '10',
      10
    );
    const minWithdrawal = parseInt(
      process.env.MIN_WITHDRAWAL || '50000',
      10
    );

    // سهمیه رایگان ماهانه
    const freeUsage = await db.query.monthlyFreeUsage.findFirst({
      where: and(
        eq(monthlyFreeUsage.userId, user.id),
        eq(monthlyFreeUsage.yearMonth, currentMonth)
      ),
    });

    const monthlyFreeLimit = 2;
    const usedFree = freeUsage?.freeCount ?? 0;
    const remainingFree = Math.max(0, monthlyFreeLimit - usedFree);

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
        referredCount,
        referralPercentage,
        minWithdrawal,
        monthlyFreeLimit,
        usedFree,
        remainingFree,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
