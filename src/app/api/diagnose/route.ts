import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { db, ensureDbReady } from '@/db';
import { diagnostics } from '@/db/schema';
import { getUserFromRequest } from '@/lib/auth';
import { RateLimiter } from '@/lib/rate-limiter';
import { handleError, BadRequestError, InsufficientCreditsError } from '@/lib/error-handler';
import { logger } from '@/utils/logger';
import {
  validateCarId,
  validateYear,
  validateDescription,
  validateCustomCarName,
  validateOptionalId,
  looksLikeCustomCarLabel,
} from '@/lib/validation';
import { isGoldenActive } from '@/lib/user-status';
import { hasFreeQuota, consumeDiagnoseQuota, consumeQuestionQuota, saveDiagnostic } from '@/lib/diagnose-billing';
import { buildCarDetails, storedCarId } from '@/lib/car-details';
import { chatCompletion } from '@/lib/ai';
import {
  SYSTEM_PROMPT_FREE,
  SYSTEM_PROMPT_PREMIUM,
  SYSTEM_PROMPT_MOBILE,
  isMobileDirectDiagnosisRequest,
} from '@/lib/prompts';
import { structuredToMarkdown, tryParseStructuredDiagnose } from '@/lib/diagnose-result';
import {
  formatGaragesForChat,
  getChatApprovedGaragesNearby,
} from '@/lib/chat-garages';
import type { User } from '@/types';

export const maxDuration = 90;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureDbReady();
    const user = (await getUserFromRequest(request)) as User;
    const { searchParams } = request.nextUrl;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10) || 20, 50);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);

    const history = db
      .select()
      .from(diagnostics)
      .where(eq(diagnostics.userId, user.id))
      .orderBy(desc(diagnostics.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

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
    await ensureDbReady();
    const user = (await getUserFromRequest(request)) as User;
    const ip = RateLimiter.getIP(request);
    RateLimiter.checkComposite(
      [
        { value: ip, label: 'ip' },
        { value: String(user.id), label: 'user' },
      ],
      'diagnose',
      12,
      10 * 60 * 1000
    );

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      throw new BadRequestError('بدنه درخواست نامعتبر است');
    }
    logger.info('Diagnose POST received', {
      userId: user.id,
      ip,
      hasCarId: Boolean((body as { carId?: unknown }).carId),
      hasDescription: Boolean((body as { description?: unknown }).description),
    });
    const payload = body as Record<string, unknown>;
    let rawCarId = payload.carId;
    let rawCarName = payload.carName;
    if (looksLikeCustomCarLabel(rawCarId)) {
      rawCarName = rawCarName || rawCarId;
      rawCarId = 'custom';
    }
    const carId = validateCarId(String(rawCarId ?? ''));
    const year = validateYear(payload.year as string | number | undefined | null);
    const description = validateDescription(String(payload.description ?? ''));
    const customCarName = validateCustomCarName(
      carId === 'custom'
        ? String(rawCarName ?? payload.carName ?? '')
        : (payload.carName as string | undefined)
    );
    const previousDiagnosticId = validateOptionalId(
      payload.previousDiagnosticId ?? payload.followUpId,
      'previousDiagnosticId'
    );

    const now = new Date();
    const golden = isGoldenActive(user, now);
    const currentMonth = now.toISOString().slice(0, 7);
    const mobileDirect = isMobileDirectDiagnosisRequest(description);

    let followUpBlock = '';
    let previousFollowUpRound = 0;
    let previousWasQuestions = false;
    if (previousDiagnosticId) {
      const prev = db
        .select()
        .from(diagnostics)
        .where(eq(diagnostics.id, previousDiagnosticId))
        .get();
      if (!prev || prev.userId !== user.id) {
        throw new BadRequestError('عیب‌یابی قبلی یافت نشد');
      }
      const previousStructured = tryParseStructuredDiagnose(prev.result);
      previousFollowUpRound = Number(previousStructured?.followUpRound || 0);
      previousWasQuestions = previousStructured?.responseMode === 'questions';
      // کانتکست قبلی کوتاه‌تر = توکن ورودی کمتر = سرعت بیشتر
      const prevResultSnippet = prev.result.slice(0, mobileDirect ? 900 : 1800);
      followUpBlock = `\n\n[عیب‌یابی قبلی]\nشرح: ${prev.description.slice(0, 400)}\nنتیجه:\n${prevResultSnippet}\n`;
    }

    const isAnswerToQuestion = previousWasQuestions;
    const needsHalfCredit = isAnswerToQuestion || !previousDiagnosticId;
    const forceFinalDiagnosis =
      mobileDirect || (previousWasQuestions && previousFollowUpRound >= 5);

    if (!golden) {
      const freeAvailable = hasFreeQuota(user.id, currentMonth, db);
      if (!freeAvailable && (needsHalfCredit ? user.credits < 0.5 : user.credits <= 0)) {
        throw new InsufficientCreditsError(
          needsHalfCredit
            ? 'برای ادامهٔ عیب‌یابی حداقل نیم اعتبار لازم است.'
            : 'اعتبار شما برای عیب‌یابی کافی نیست. لطفاً حساب خود را شارژ کنید.'
        );
      }
    }

    const carDetails = buildCarDetails(carId, year, customCarName);

    const systemPrompt = mobileDirect
      ? SYSTEM_PROMPT_MOBILE
      : golden
        ? SYSTEM_PROMPT_PREMIUM
        : SYSTEM_PROMPT_FREE;

    const stageRules = mobileDirect
      ? 'همیشه responseMode=diagnosis بده. هیچ سؤالی نپرس. پاسخ فشرده باشد.'
      : `این یک درخواست اولیه است اگر previousDiagnosticId وجود ندارد. اگر previousDiagnosticId وجود دارد، این متن پاسخ کاربر به مرحله قبل است. ${previousWasQuestions ? `مرحله قبلی سؤال‌محور بوده و شماره سؤال آن ${previousFollowUpRound} است؛ سؤال تکراری نپرس.` : ''}${forceFinalDiagnosis ? ' حتماً اکنون فقط responseMode=diagnosis بده و هیچ سؤال دیگری نپرس.' : ''}`;

    logger.info('Diagnose requested', {
      userId: user.id,
      carId,
      year,
      ip,
      descLen: description.length,
      golden,
      mobileDirect,
      promptTier: mobileDirect ? 'mobile' : golden ? 'premium' : 'free',
    });

    const aiStarted = Date.now();
    const { text: resultTextRaw } = await chatCompletion({
      systemPrompt,
      userContent: `[مشخصات خودرو]\n${carDetails}${followUpBlock}\n\n[شرح خرابی/پاسخ جدید کاربر]\n${description}\n\n[قواعد]\n${stageRules}`,
      userId: user.id,
      // مسیر موبایل: سقف توکن و timeout سخت‌گیرانه‌تر
      maxTokens: mobileDirect ? 1400 : undefined,
      timeoutMs: mobileDirect ? 30000 : undefined,
    });
    logger.info('Diagnose AI done', {
      userId: user.id,
      ms: Date.now() - aiStarted,
      rawLen: resultTextRaw.length,
    });

    const structured = tryParseStructuredDiagnose(resultTextRaw);
    let resultText = structured
      ? structuredToMarkdown(structured)
      : resultTextRaw;

    const cityHint = typeof payload.city === 'string' ? payload.city : undefined;
    const userLat = Number(payload.lat);
    const userLng = Number(payload.lng);
    try {
      if (structured?.responseMode === 'questions') {
        // Do not distract a user who is answering clarification questions with garage promotion.
      } else {
        // بودجهٔ زمانی کوتاه تا بعد از LLM کاربر معطل تبلیغ نشود
        const promo = await withTimeout(
          getChatApprovedGaragesNearby({
            lat: Number.isFinite(userLat) ? userLat : null,
            lng: Number.isFinite(userLng) ? userLng : null,
            city: cityHint || null,
            limit: 3,
          }),
          2500
        );
        if (promo) {
          resultText = resultText + formatGaragesForChat(promo);
        }
      }
    } catch (e) {
      logger.warn('chat garage promo append failed', e);
    }

    let remainingFree: number | null = null;
    let remainingCredits: number | null = null;
    let diagnosticId: number | undefined;
    let usedFree = false;

    try {
      const txResult = db.transaction((tx) => {
        // اپ موبایل همیشه diagnosis است؛ مسیر questions فقط برای کلاینت‌های قدیمی
        const billing =
          !mobileDirect && structured?.responseMode === 'questions'
            ? consumeQuestionQuota(tx, user, currentMonth, now)
            : consumeDiagnoseQuota(tx, user, now);
        const id = saveDiagnostic(tx, {
          userId: user.id,
          carId: storedCarId(carId, year, customCarName),
          description,
          result: resultText,
        });
        return { billing, id };
      });
      remainingFree = txResult.billing.remainingFree;
      remainingCredits = txResult.billing.remainingCredits;
      usedFree = txResult.billing.usedFree;
      diagnosticId = txResult.id;
    } catch (txError) {
      logger.error('Transaction failed during diagnose save', {
        userId: user.id,
        error:
          txError instanceof Error
            ? { message: txError.message, stack: txError.stack }
            : txError,
      });
      throw txError;
    }

    logger.info('Diagnose successful', {
      userId: user.id,
      diagnosticId,
      usedFree,
      remainingFreeQuestions: golden ? null : remainingFree,
      totalMs: Date.now() - aiStarted,
    });

    return NextResponse.json({
      success: true,
      data: { result: resultText, structured: structured ?? null },
      diagnosticId,
      remainingCredits: !golden ? remainingCredits : null,
      remainingFreeQuestions: !golden ? remainingFree : null,
    });
  } catch (error) {
    return handleError(error);
  }
}
