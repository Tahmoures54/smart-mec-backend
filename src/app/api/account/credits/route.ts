// ═══════════════════════════════════════════════════════════
// User Profile / Credits / Referral Stats - Smart-MEC
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getUserFromRequest } from '@/lib/auth';
import { handleError } from '@/lib/error-handler';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

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
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
