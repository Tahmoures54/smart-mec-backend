// ═══════════════════════════════════════════════════════════
// User Profile / Credits / Referral Stats - Smart-MEC
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, monthlyFreeUsage } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getUserFromRequest } from '@/lib/auth';
import { handleError, BadRequestError } from '@/lib/error-handler';
import { logger } from '@/utils/logger';
import {
  monthlyFreeLimit,
  referralPercentage,
  minWithdrawal,
} from '@/lib/constants';
import { isGoldenActive } from '@/lib/user-status';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      throw new BadRequestError('کاربر یافت نشد یا نشست شما به پایان رسیده است.');
    }

    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const golden = isGoldenActive(user, now);

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.referredBy, user.id));

    const referredCount = Number(countResult[0]?.count ?? 0);

    const freeUsage = await db.query.monthlyFreeUsage.findFirst({
      where: and(
        eq(monthlyFreeUsage.userId, user.id),
        eq(monthlyFreeUsage.yearMonth, currentMonth)
      ),
    });

    const usedFree = freeUsage?.freeCount ?? 0;
    const freeLimit = monthlyFreeLimit();
    const remainingFree = golden ? null : Math.max(0, freeLimit - usedFree);

    logger.info('User profile fetched', {
      userId: user.id,
      referredCount,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        phone: user.phone,
        credits: user.credits,
        isGolden: golden,
        isGoldenActive: golden,
        goldenExpiresAt: user.goldenExpiresAt,
        referralCode: user.referralCode,
        earnings: user.earnings ?? 0,
        referredCount,
        referralPercentage: referralPercentage(),
        minWithdrawal: minWithdrawal(),
        monthlyFreeLimit: freeLimit,
        usedFree,
        remainingFree,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
