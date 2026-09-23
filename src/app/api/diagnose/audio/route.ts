// ═══════════════════════════════════════════════════════════
// AI Diagnose from Audio (multipart) - Smart-MEC
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDbReady } from '@/db';
import { getUserFromRequest } from '@/lib/auth';
import {
  validateCarId,
  validateYear,
  validateCustomCarName,
  looksLikeCustomCarLabel,
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
import { structuredToMarkdown, tryParseStructuredDiagnose } from '@/lib/diagnose-result';

export const maxDuration = 90;

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
      'diagnose_audio',
      3,
      10 * 60 * 1000
    );

    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 10 * 1024 * 1024) {
      throw new BadRequestError('حجم درخواست صوتی بیش از حد مجاز است (حداکثر ۱۰ مگابایت).');
    }

    const form = await request.formData();
    let rawCarId = String(form.get('carId') || '');
    let rawCarName = form.get('carName') ? String(form.get('carName')) : null;
    if (looksLikeCustomCarLabel(rawCarId)) {
      rawCarName = rawCarName || rawCarId;
      rawCarId = 'custom';
    }
    const carId = validateCarId(rawCarId);
    const year = validateYear(String(form.get('year') || ''));
    const customCarName = validateCustomCarName(
      carId === 'custom' ? (rawCarName || null) : rawCarName
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
      const type = String((audio as File).type || '').toLowerCase();
      const name = (audio as File).name || 'engine_sound';
      const allowedTypes = new Set([
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/x-wav',
        'audio/webm',
        'audio/ogg',
        'audio/mp4',
        'audio/aac',
        'audio/x-m4a',
        'video/mp4',
      ]);
      if (size <= 0) {
        throw new BadRequestError('فایل صوتی خالی است.');
      }
      if (type && !allowedTypes.has(type)) {
        throw new BadRequestError('فرمت فایل صوتی پشتیبانی نمی‌شود.');
      }
      audioMeta = `فایل صوتی دریافت شد (نام: ${name}، حجم تقریبی: ${Math.round(size / 1024)} کیلوبایت).`;
      if (size > 8 * 1024 * 1024) {
        throw new BadRequestError('حجم فایل صوتی بیش از حد مجاز است (حداکثر ۸ مگابایت).');
      }
    }

    const now = new Date();
    const golden = isGoldenActive(user, now);
    const currentMonth = now.toISOString().slice(0, 7);

    if (!golden) {
      const freeAvailable = hasFreeQuota(user.id, currentMonth, db);
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

    const { text: resultTextRaw } = await chatCompletion({
      systemPrompt: SYSTEM_PROMPT_AUDIO,
      userContent: `[مشخصات خودرو]\n${carDetails}\n\n[اطلاعات صوتی / شرح]\n${description}`,
      userId: user.id,
      timeoutMs: 30000,
      maxTokens: 1000,
    });
    const structured = tryParseStructuredDiagnose(resultTextRaw);
    const resultText = structured
      ? structuredToMarkdown(structured)
      : resultTextRaw;

    const txResult = db.transaction((tx) => {
      const billing = consumeDiagnoseQuota(tx, user, now);
      const id = saveDiagnostic(tx, {
        userId: user.id,
        carId: storedCarId(carId, year, customCarName),
        description: description.slice(0, 2000),
        result: resultText,
      });
      return { billing, id };
    });

    logger.info('Audio diagnose successful', { userId: user.id, diagnosticId: txResult.id });

    return NextResponse.json({
      success: true,
      data: { result: resultText, structured: structured ?? null },
      diagnosticId: txResult.id,
      remainingCredits: !golden ? txResult.billing.remainingCredits : null,
      remainingFreeQuestions: !golden ? txResult.billing.remainingFree : null,
    });
  } catch (error) {
    return handleError(error);
  }
}
