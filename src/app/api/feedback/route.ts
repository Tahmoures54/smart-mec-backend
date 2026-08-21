// ═══════════════════════════════════════════════════════════
// Diagnosis Feedback - Smart-MEC
// امتیاز و نظر کاربر روی نتیجه عیب‌یابی = داده طلایی محصول
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDbReady } from '@/db';
import { diagnostics } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getUserFromRequest } from '@/lib/auth';
import { handleError, BadRequestError, NotFoundError } from '@/lib/error-handler';
import { RateLimiter } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    await ensureDbReady();

    const ip = RateLimiter.getIP(request);
    await RateLimiter.check(ip, 'feedback', 20, 10 * 60 * 1000);

    const user = await getUserFromRequest(request);
    const body = await request.json();

    const diagnosticId = Number(body.diagnosticId);
    const rating = Number(body.rating);
    const feedback =
      typeof body.feedback === 'string' ? body.feedback.trim().slice(0, 1000) : null;

    if (!Number.isInteger(diagnosticId) || diagnosticId <= 0) {
      throw new BadRequestError('شناسه عیب‌یابی نامعتبر است');
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestError('امتیاز باید بین ۱ تا ۵ باشد');
    }

    const row = await db.query.diagnostics.findFirst({
      where: and(
        eq(diagnostics.id, diagnosticId),
        eq(diagnostics.userId, user.id)
      ),
    });

    if (!row) {
      throw new NotFoundError('عیب‌یابی یافت نشد');
    }

    await db
      .update(diagnostics)
      .set({
        rating,
        feedback: feedback || null,
      })
      .where(eq(diagnostics.id, diagnosticId));

    return NextResponse.json({
      success: true,
      message: 'نظر شما ثبت شد. ممنون از کمکت! 🙏',
    });
  } catch (error) {
    return handleError(error);
  }
}
