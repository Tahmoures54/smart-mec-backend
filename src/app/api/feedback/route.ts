import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { diagnostics, feedbacks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getUserFromRequest } from '@/lib/auth';
import { handleError, BadRequestError } from '@/lib/error-handler';
import { RateLimiter } from '@/lib/rate-limiter';
import { validatePositiveInteger } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    RateLimiter.check(RateLimiter.getIP(request), 'feedback', 10, 60 * 60 * 1000);

    const body = await request.json();
    const rating = Number(body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestError('امتیاز باید بین ۱ تا ۵ باشد');
    }

    const comment = body.comment ? String(body.comment).trim() : '';
    if (comment.length > 1000) {
      throw new BadRequestError('نظر نباید بیشتر از ۱۰۰۰ کاراکتر باشد');
    }

    let diagnosticId: number | null = null;
    if (body.diagnosticId) {
      diagnosticId = validatePositiveInteger(body.diagnosticId, 'diagnosticId');
      const diag = await db.query.diagnostics.findFirst({
        where: eq(diagnostics.id, diagnosticId),
      });
      if (!diag || diag.userId !== user.id) {
        throw new BadRequestError('عیب‌یابی مرتبط یافت نشد');
      }
    }

    const [row] = await db
      .insert(feedbacks)
      .values({
        userId: user.id,
        diagnosticId,
        rating,
        comment: comment || null,
      })
      .returning({ id: feedbacks.id });

    return NextResponse.json({
      success: true,
      message: 'بازخورد شما ثبت شد. ممنون از همراهی‌تان.',
      data: { id: row?.id, rating },
    });
  } catch (error) {
    return handleError(error);
  }
}
