// ═══════════════════════════════════════════════════════════
// AI Diagnose Route - Smart-MEC
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { diagnostics } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getUserFromRequest } from '@/lib/auth';
import {
  validateCarId,
  validateDescription,
  validateYear,
  validateCustomCarName,
  validateOptionalId,
} from '@/lib/validation';
import {
  handleError,
  InsufficientCreditsError,
  BadRequestError,
} from '@/lib/error-handler';
import { RateLimiter } from '@/lib/rate-limiter';
import { logger } from '@/utils/logger';
import { User } from '@/types';
import { isGoldenActive } from '@/lib/user-status';
import { hasFreeQuota, consumeDiagnoseQuota, saveDiagnostic } from '@/lib/diagnose-billing';
import { buildCarDetails, storedCarId } from '@/lib/car-details';
import { chatCompletion } from '@/lib/ai';
import { SYSTEM_PROMPT_FREE, SYSTEM_PROMPT_PREMIUM } from '@/lib/prompts';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new Error('کاربر یافت نشد');

    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get('limit') || '20'), 50);
    const offset = Number(url.searchParams.get('offset') || '0');

    const history = await db.query.diagnostics.findMany({
      where: eq(diagnostics.userId, user.id),
      orderBy: [desc(diagnostics.createdAt)],
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: history,
      pagination: { limit, offset },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = (await getUserFromRequest(request)) as User;
    const ip = RateLimiter.getIP(request);
    RateLimiter.check(ip, 'diagnose', 5, 10 * 60 * 1000);

    const body = await request.json();
    const carId = validateCarId(body.carId);
    const year = validateYear(body.year);
    const description = validateDescription(body.description);
    const customCarName = validateCustomCarName(body.carName);
    const previousDiagnosticId = validateOptionalId(
      body.previousDiagnosticId ?? body.followUpId,
      'previousDiagnosticId'
    );

    const now = new Date();
    const golden = isGoldenActive(user, now);
    const currentMonth = now.toISOString().slice(0, 7);

    if (!golden) {
      const freeAvailable = await hasFreeQuota(user.id, currentMonth, db.query);
      if (!freeAvailable && user.credits <= 0) {
        throw new InsufficientCreditsError(
          'اعتبار شما برای عیب‌یابی کافی نیست. لطفاً حساب خود را شارژ کنید.'
        );
      }
    }

    const carDetails = buildCarDetails(carId, year, customCarName);

    let followUpBlock = '';
    if (previousDiagnosticId) {
      const prev = await db.query.diagnostics.findFirst({
        where: eq(diagnostics.id, previousDiagnosticId),
      });
      if (!prev || prev.userId !== user.id) {
        throw new BadRequestError('عیب‌یابی قبلی یافت نشد');
      }
      followUpBlock = `\n\n[عیب‌یابی قبلی]\nشرح: ${prev.description}\nنتیجه:\n${prev.result.slice(0, 3000)}\n`;
    }

    logger.info('Diagnose requested', { userId: user.id, carId, year, ip });

    const { text: resultText } = await chatCompletion({
      systemPrompt: golden ? SYSTEM_PROMPT_PREMIUM : SYSTEM_PROMPT_FREE,
      userContent: `[مشخصات خودرو]\n${carDetails}${followUpBlock}\n\n[شرح خرابی کاربر]\n${description}`,
      userId: user.id,
    });

    let remainingFree: number | null = null;
    let remainingCredits: number | null = null;
    let diagnosticId: number | undefined;
    let usedFree = false;

    try {
      await db.transaction(async (tx) => {
        const billing = await consumeDiagnoseQuota(tx, user, now);
        remainingFree = billing.remainingFree;
        remainingCredits = billing.remainingCredits;
        usedFree = billing.usedFree;
        diagnosticId = await saveDiagnostic(tx, {
          userId: user.id,
          carId: storedCarId(carId, year, customCarName),
          description,
          result: resultText,
        });
      });
    } catch (txError) {
      logger.error('Transaction failed during diagnose save', {
        userId: user.id,
        error: txError,
      });
      throw txError;
    }

    logger.info('Diagnose successful', {
      userId: user.id,
      diagnosticId,
      usedFree,
      remainingFreeQuestions: golden ? null : remainingFree,
    });

    return NextResponse.json({
      success: true,
      data: { result: resultText },
      diagnosticId,
      remainingCredits: !golden ? remainingCredits : null,
      remainingFreeQuestions: !golden ? remainingFree : null,
    });
  } catch (error) {
    return handleError(error);
  }
}
