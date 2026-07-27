// ═══════════════════════════════════════════════════════════
// User Profile/Credits Route - Smart-MEC
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { handleError } from '@/lib/error-handler';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        phone: user.phone,
        credits: user.credits,
        isGolden: user.isGolden,
        goldenExpiresAt: user.goldenExpiresAt,
        referralCode: user.referralCode,
        earnings: user.earnings
      }
    });
  } catch (error) {
    return handleError(error);
  }
}