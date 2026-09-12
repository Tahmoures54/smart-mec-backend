// ═══════════════════════════════════════════════════════════
// AI Diagnose from Audio (multipart) - Smart-MEC
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { getUserFromRequest } from '@/lib/auth';
import {
  validateCarId,
  validateYear,
  validateCustomCarName,
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
import { SYSTEM_PROMPT_AUDIO } from '@/lib/prompts';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const user = (await getUserFromRequest(request)) as User;
    const ip = RateLimiter.getIP(request);
    RateLimiter.check(ip, 'diagnose_audio', 5, 10 * 60 * 1000);

    const form = await request.formData();
    const carId = validateCarId(String(form.get('carId') || ''));
    const year = validateYear(String(form.get('year') || ''));
    const customCarName = validateCustomCarName(
      form.get('carName') ? String(form.get('carName')) : null
    );
    const clientFeatures = form.get('audioFeatures')
      ? String(form.get('audioFeatures')).trim()
      : '';
    const clientNote = form.get('description')
      ? String(form.get('description')).trim()
      : '';

    const audio = form.get('audio');
    let audioMeta = 'فایل صوتی ارسال نشده یا قابل خواندن نبود.';
    if (audio && typeof audio === 'object' && 'size' in audio) {
      const size = Number((audio as Blob).size || 0);
      const name = (audio as File).name || 'engine_sound';
      audioMeta = `فایل صوتی دریافت شد (نام: ${name}، حجم تقریبی: ${Math.round(size / 1024)} کیلوبایت).`;
      if (size > 8 * 1024 * 1024) {
        throw new BadRequestError('حجم فایل صوتی بیش از حد مجاز است (حداکثر ۸ مگابایت).');
      }
    }

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
    const description = [
      'کاربر صدای موتور را برای تحلیل ارسال کرده است.',
      audioMeta,
      clientFeatures ? `ویژگی‌های استخراج‌شده روی دستگاه:\n${clientFeatures}` : '',
      clientNote ? `توضیح کاربر: ${clientNote}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const { text: resultText } = await chatCompletion({
      systemPrompt: SYSTEM_PROMPT_AUDIO,
      userContent: `[مشخصات خودرو]\n${carDetails}\n\n[اطلاعات صوتی / شرح]\n${description}`,
      userId: user.id,
    });

    let remainingFree: number | null = null;
    let remainingCredits: number | null = null;
    let diagnosticId: number | undefined;

    await db.transaction(async (tx) => {
      const billing = await consumeDiagnoseQuota(tx, user, now);
      remainingFree = billing.remainingFree;
      remainingCredits = billing.remainingCredits;
      diagnosticId = await saveDiagnostic(tx, {
        userId: user.id,
        carId: storedCarId(carId, year, customCarName),
        description: description.slice(0, 2000),
        result: resultText,
      });
    });

    logger.info('Audio diagnose successful', { userId: user.id, diagnosticId });

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
