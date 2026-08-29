// ═══════════════════════════════════════════════════════════
// AI Diagnose from Audio (multipart) - Smart-MEC
// اپ ممکن است ویژگی‌های محلی صدا را هم بفرستد؛ فایل اختیاری است.
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { diagnostics, users, goldenUsage, monthlyFreeUsage } from '@/db/schema';
import { eq, desc, sql, and, gt, lt } from 'drizzle-orm';
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
import carsData from '@/data/cars.json';
import { Car, User } from '@/types';

export const maxDuration = 60;

const SYSTEM_PROMPT = `تو یک مکانیک دلسوز و کارشناس خودروهای داخلی هستی به نام «مکانیک هوشمند».
کاربر صدای موتور را ضبط کرده و/یا ویژگی‌های صوتی ارسال کرده است.
بر اساس مشخصات خودرو و اطلاعات صوتی، علل محتمل را با Markdown و لحن صمیمی بگو.
قوانین: همدردی، حداکثر ۳ علت، بدون قیمت ریالی دقیق، هشدار کلاهبرداری، سلب مسئولیت در انتها.`;

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
    const isGoldenActive =
      user.isGolden &&
      user.goldenExpiresAt &&
      new Date(user.goldenExpiresAt) > now;
    const currentMonth = now.toISOString().slice(0, 7);

    let freeAvailable = false;
    if (!isGoldenActive) {
      const existingFree = await db.query.monthlyFreeUsage.findFirst({
        where: and(
          eq(monthlyFreeUsage.userId, user.id),
          eq(monthlyFreeUsage.yearMonth, currentMonth)
        ),
      });
      if (!existingFree || existingFree.freeCount < 2) freeAvailable = true;
    }

    if (!isGoldenActive && !freeAvailable && user.credits <= 0) {
      throw new InsufficientCreditsError(
        'اعتبار شما برای عیب‌یابی کافی نیست. لطفاً حساب خود را شارژ کنید.'
      );
    }

    let carDetails: string;
    if (carId === 'custom') {
      if (!customCarName) {
        throw new BadRequestError('برای خودرو خارج از لیست، نام خودرو الزامی است.');
      }
      carDetails = `نام خودرو: ${customCarName}\nسال ساخت: ${year}`;
    } else {
      const carsList: Car[] = carsData as Car[];
      const car = carsList.find((c) => c.id.toString() === carId);
      if (!car) throw new BadRequestError('خودروی انتخاب شده نامعتبر است.');
      const issues = Array.isArray(car.commonIssues)
        ? car.commonIssues.join('، ')
        : car.commonIssues ?? 'نامشخص';
      carDetails = `برند: ${car.brand}\nمدل: ${car.model}\nسال: ${year}\nموتور: ${car.engine}\nمشکلات شایع: ${issues}`;
    }

    const description = [
      'کاربر صدای موتور را برای تحلیل ارسال کرده است.',
      audioMeta,
      clientFeatures ? `ویژگی‌های استخراج‌شده روی دستگاه:\n${clientFeatures}` : '',
      clientNote ? `توضیح کاربر: ${clientNote}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const apiKey = process.env.DEEPSEEK_API_KEY;
    const apiEndpoint =
      process.env.DEEPSEEK_API_ENDPOINT || 'https://api.deepseek.com/v1';
    const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    if (!apiKey) throw new Error('تنظیمات هوش مصنوعی در سرور ناقص است.');

    const AI_TIMEOUT = parseInt(process.env.AI_TIMEOUT_MS || '55000', 10);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT);

    let resultText = '';
    try {
      const response = await fetch(`${apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: `[مشخصات خودرو]\n${carDetails}\n\n[اطلاعات صوتی / شرح]\n${description}`,
            },
          ],
          temperature: 0.5,
          max_tokens: parseInt(process.env.AI_MAX_TOKENS || '4000', 10),
          user: `user_${user.id}`,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error('هوش مصنوعی در حال حاضر پاسخگو نیست.');
      }
      const data = await response.json();
      resultText = data.choices?.[0]?.message?.content;
      if (!resultText) throw new Error('پاسخ نامعتبر از سرویس هوش مصنوعی');
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      if (e.name === 'AbortError') {
        throw new Error('زمان پاسخگویی هوش مصنوعی طولانی شد.');
      }
      throw new Error(e.message || 'خطا در ارتباط با هوش مصنوعی');
    } finally {
      clearTimeout(timeoutId);
    }

    let remainingFree: number | null = null;
    let remainingCredits: number | null = null;
    let diagnosticId: number | undefined;

    await db.transaction(async (tx) => {
      if (isGoldenActive) {
        const monthlyLimit = user.monthlyLimit ?? 200;
        const incremented = await tx
          .update(goldenUsage)
          .set({ count: sql`${goldenUsage.count} + 1`, updatedAt: now })
          .where(
            and(
              eq(goldenUsage.userId, user.id),
              eq(goldenUsage.yearMonth, currentMonth),
              lt(goldenUsage.count, monthlyLimit)
            )
          )
          .returning();

        if (incremented.length === 0) {
          const existingUsage = await tx.query.goldenUsage.findFirst({
            where: and(
              eq(goldenUsage.userId, user.id),
              eq(goldenUsage.yearMonth, currentMonth)
            ),
          });
          if (!existingUsage) {
            await tx.insert(goldenUsage).values({
              userId: user.id,
              yearMonth: currentMonth,
              count: 1,
              updatedAt: now,
            });
          } else {
            throw new BadRequestError(
              `سقف مجاز عیب‌یابی این ماه (${monthlyLimit}) تمام شده است.`
            );
          }
        }
      } else if (freeAvailable) {
        const updated = await tx
          .update(monthlyFreeUsage)
          .set({
            freeCount: sql`${monthlyFreeUsage.freeCount} + 1`,
            updatedAt: now,
          })
          .where(
            and(
              eq(monthlyFreeUsage.userId, user.id),
              eq(monthlyFreeUsage.yearMonth, currentMonth),
              lt(monthlyFreeUsage.freeCount, 2)
            )
          )
          .returning();

        if (updated.length === 0) {
          const existingFree = await tx.query.monthlyFreeUsage.findFirst({
            where: and(
              eq(monthlyFreeUsage.userId, user.id),
              eq(monthlyFreeUsage.yearMonth, currentMonth)
            ),
          });
          if (!existingFree) {
            await tx.insert(monthlyFreeUsage).values({
              userId: user.id,
              yearMonth: currentMonth,
              freeCount: 1,
              updatedAt: now,
            });
            remainingFree = 1;
          } else {
            const creditUpdate = await tx
              .update(users)
              .set({ credits: sql`${users.credits} - 1` })
              .where(and(eq(users.id, user.id), gt(users.credits, 0)))
              .returning();
            if (creditUpdate.length === 0) {
              throw new InsufficientCreditsError('اعتبار کافی نیست.');
            }
            remainingCredits = creditUpdate[0].credits;
          }
        } else {
          remainingFree = 2 - updated[0].freeCount;
        }
      } else {
        const updateResult = await tx
          .update(users)
          .set({ credits: sql`${users.credits} - 1` })
          .where(and(eq(users.id, user.id), gt(users.credits, 0)))
          .returning();
        if (updateResult.length === 0) {
          throw new InsufficientCreditsError('موجودی شما تمام شده است.');
        }
        remainingCredits = updateResult[0].credits;
      }

      const storedCarId =
        carId === 'custom'
          ? `custom:${customCarName}:${year}`
          : `${carId}:${year}`;

      const inserted = await tx
        .insert(diagnostics)
        .values({
          userId: user.id,
          carId: storedCarId,
          description: description.slice(0, 2000),
          result: resultText,
        })
        .returning({ id: diagnostics.id });

      diagnosticId = inserted[0]?.id;
    });

    logger.info('Audio diagnose successful', { userId: user.id, diagnosticId });

    return NextResponse.json({
      success: true,
      data: { result: resultText },
      diagnosticId,
      remainingCredits: !isGoldenActive ? remainingCredits : null,
      remainingFreeQuestions: !isGoldenActive ? remainingFree : null,
    });
  } catch (error) {
    return handleError(error);
  }
}
