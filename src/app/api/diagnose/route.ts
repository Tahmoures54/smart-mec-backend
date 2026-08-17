// ═══════════════════════════════════════════════════════════
// AI Diagnose Route - Smart-MEC (Developed Version)
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { diagnostics, users, goldenUsage } from '@/db/schema';
import { eq, desc, sql, and, gt, lt } from 'drizzle-orm';
import { getUserFromRequest } from '@/lib/auth';
import {
  validateCarId,
  validateDescription,
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

const SYSTEM_PROMPT_FREE = `تو یک مکانیک بسیار دلسوز، کهنه‌کار و کارشناس خبره خودروهای داخلی و مونتاژی هستی. نام تو «مکانیک هوشمند» است.
وظیفه: بر اساس مشخصات فنی خودرو و شرح حال کاربر، با لحنی گرم، صمیمی و مثل یک رفیق، عیب‌یابی کن.
قوانین دقیق:
۱. همدردی اولیه: اول با کاربر همدردی کن و بهش آرامش بده (اگر مشکل خطرناک است، ضمن همدردی، فوریت موضوع را هم گوشزد کن).
۲. علل اصلی: تا سه علت اصلی و محتمل را با استفاده از لیست‌های بولت‌دار (Markdown) و به زبان ساده توضیح بده.
۳. صداقت: اگر اطلاعات خودرو ناقص است یا علت خرابی را دقیق نمی‌دانی، صادقانه بگو و حدس‌های اولیه‌ات را مطرح کن.
۴. برآورد هزینه: به هیچ وجه قیمت دقیق ریالی نده! فقط از عبارات "جزئی و کم‌هزینه"، "متوسط و قابل قبول" یا "سنگین و پرهزینه" استفاده کن.
۵. جلوگیری از کلاهبرداری: حتماً با تیتر «⚠️ کلاه سرت نره!» یک هشدار ملموس بده. (مثلاً: اگر گفتند کامپیوتر سوخته، بگو اول سیم‌کشی رو با دیاگ چک کن).
۶. سلب مسئولیت: در انتها بگو «🚨 رفیق، این تحلیل هوش مصنوعی فقط یه راهنمایی اولیه است و جای بازدید حضوری مکانیک متخصص رو نمی‌گیره.»
۷. تبلیغ نسخه طلایی: در آخرین خط حتماً بنویس: «💎 با تهیه اشتراک طلایی اپلیکیشن، می‌تونی نامحدود راجع به ماشینت ازم سوال بپرسی!»
۸. فرمت و طول متن: از عناوین Markdown (مانند ##) استفاده کن و پاسخ را در حدود ۴۰۰ کلمه، پارسی سلیس و روان جمع‌بندی کن.`;

const SYSTEM_PROMPT_PREMIUM = SYSTEM_PROMPT_FREE.replace(
  '«💎 با تهیه اشتراک طلایی اپلیکیشن، می‌تونی نامحدود راجع به ماشینت ازم سوال بپرسی!»',
  '«👑 چون کاربر طلایی هستی، هر سوال دیگه‌ای راجع به این مشکل یا ماشینت داری با خیال راحت در همین صفحه ازم بپرس.»'
);

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new Error('کاربر یافت نشد');

    const url = new URL(request.url);
    if (url.searchParams.get('history') === 'true') {
      // توسعه: صفحه‌بندی تاریخچه برای جلوگیری از فشار روی دیتابیس
      const limit = Math.min(Number(url.searchParams.get('limit') || '20'), 50);
      const offset = Number(url.searchParams.get('offset') || '0');

      const history = await db.query.diagnostics.findMany({
        where: eq(diagnostics.userId, user.id),
        orderBy: [desc(diagnostics.createdAt)],
        limit: limit,
        offset: offset,
      });
      
      return NextResponse.json({
        success: true,
        data: history,
        pagination: { limit, offset }
      });
    }

    throw new BadRequestError('پارامترهای درخواست نامعتبر است');
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = (await getUserFromRequest(request)) as User;
    const ip = RateLimiter.getIP(request);

    // ۵ درخواست در ۱۰ دقیقه
    RateLimiter.check(ip, 'diagnose', 5, 10 * 60 * 1000);

    const body = await request.json();
    const carId = validateCarId(body.carId);
    const year = validateYear(body.year);
    const description = validateDescription(body.description);
    const customCarName = validateCustomCarName(body.carName);

    const now = new Date();
    const isGoldenActive =
      user.isGolden &&
      user.goldenExpiresAt &&
      new Date(user.goldenExpiresAt) > now;

    const currentMonth = now.toISOString().slice(0, 7);

    // ─── محدودیت مصرف ───
    if (isGoldenActive) {
      const monthlyLimit = user.monthlyLimit ?? 200;
      
      // توسعه: آپدیت اتمیک برای جلوگیری از دور زدن سقف ماهانه در درخواست‌های همزمان
      const incremented = await db
        .update(goldenUsage)
        .set({ 
          count: sql`${goldenUsage.count} + 1`, 
          updatedAt: now 
        })
        .where(
          and(
            eq(goldenUsage.userId, user.id),
            eq(goldenUsage.yearMonth, currentMonth),
            lt(goldenUsage.count, monthlyLimit) // فقط اگر به سقف نرسیده باشد آپدیت کن
          )
        )
        .returning();

      // اگر آپدیت انجام نشود یعنی رکوردی وجود ندارد یا سقف پر شده
      if (incremented.length === 0) {
        // بررسی می‌کنیم که آیا اصلا رکوردی برای این ماه وجود دارد یا خیر
        const existingUsage = await db.query.goldenUsage.findFirst({
          where: and(
            eq(goldenUsage.userId, user.id),
            eq(goldenUsage.yearMonth, currentMonth)
          ),
        });

        if (!existingUsage) {
          // اولین درخواست ماه: رکورد جدید می‌سازیم
          await db.insert(goldenUsage).values({
            userId: user.id,
            yearMonth: currentMonth,
            count: 1,
            updatedAt: now,
          });
        } else {
          // رکورد وجود داشت اما آپدیت نشد، یعنی به سقب رسیده است
          throw new BadRequestError(
            `سقف مجاز عیب‌یابی این ماه (${monthlyLimit} درخواست) به پایان رسیده است. لطفاً ماه آینده مجدداً تلاش کنید.`
          );
        }
      }
    } else {
      if (user.credits <= 0) {
        throw new InsufficientCreditsError(
          'اعتبار شما برای عیب‌یابی کافی نیست. لطفاً حساب خود را شارژ کنید.'
        );
      }
    }

    // ─── مشخصات خودرو ───
    let carDetails: string;

    if (carId === 'custom') {
      if (!customCarName) {
        throw new BadRequestError('برای خودرو خارج از لیست، نام خودرو الزامی است.');
      }
      carDetails = `نام خودرو (واردشده توسط کاربر): ${customCarName}\nسال ساخت: ${year}`;
    } else {
      const carsList: Car[] = carsData as Car[];
      const car = carsList.find((c) => c.id.toString() === carId);
      if (!car) {
        logger.warn('Invalid car ID requested', { userId: user.id, carId });
        throw new BadRequestError('خودروی انتخاب شده در سیستم نامعتبر است.');
      }

      const issues = Array.isArray(car.commonIssues)
        ? car.commonIssues.join('، ')
        : car.commonIssues ?? 'نامشخص';

      carDetails = `برند: ${car.brand}\nمدل: ${car.model}\nسال ساخت (اعلام کاربر): ${year}\nموتور: ${car.engine}\nگیربکس: ${car.gearbox ?? 'نامشخص'}\nمشکلات شایع: ${issues}`;
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    const apiEndpoint =
      process.env.DEEPSEEK_API_ENDPOINT || 'https://api.deepseek.com/v1';
    const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

    if (!apiKey) throw new Error('تنظیمات هوش مصنوعی در سرور ناقص است.');

    logger.info('Diagnose requested', { userId: user.id, carId, year, ip });
    let resultText = '';

    // توسعه: مدیریت بهتر Timeout با try...finally
    const AI_TIMEOUT = parseInt(process.env.AI_TIMEOUT_MS || '35000', 10);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT);

    try {
      const systemPrompt = isGoldenActive
        ? SYSTEM_PROMPT_PREMIUM
        : SYSTEM_PROMPT_FREE;

      const response = await fetch(`${apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `[مشخصات خودرو]\n${carDetails}\n\n[شرح خرابی کاربر]\n${description}`,
            },
          ],
          temperature: 0.7,
          // توسعه: محدودیت توکن برای جلوگیری از هزینه اضافی
          max_tokens: 800,
          // توسعه: شناسایی کاربر برای رهگیری در سرویس هوش مصنوعی
          user: `user_${user.id}` 
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          'هوش مصنوعی در حال حاضر پاسخگو نیست. لطفاً چند دقیقه دیگر تلاش کنید.'
        );
      }

      const data = await response.json();
      resultText = data.choices?.[0]?.message?.content;
      
      if (!resultText) {
        throw new Error('پاسخ نامعتبر از سرویس هوش مصنوعی');
      }
    } catch (err: any) {
      logger.error('AI API error', { error: err.message, userId: user.id });
      
      // بازگرداندن اعتبار در صورت خطای هوش مصنوعی (چون کسر اعتبار هنوز انجام نشده است، نیازی نیست)
      if (err.name === 'AbortError') {
        throw new Error(
          'زمان پاسخگویی هوش مصنوعی طولانی شد. لطفاً دوباره تلاش کنید.'
        );
      }
      throw new Error(
        err.message || 'خطا در برقراری ارتباط با سرویس هوش مصنوعی'
      );
    } finally {
      // تضمین پاک کردن تایمر در هر شرایطی
      clearTimeout(timeoutId);
    }

    // ─── کسر اعتبار (فقط برای کاربران عادی پس از موفقیت AI) ───
    if (!isGoldenActive) {
      const updateResult = await db
        .update(users)
        .set({ credits: sql`${users.credits} - 1` })
        .where(and(eq(users.id, user.id), gt(users.credits, 0)))
        .returning();

      if (updateResult.length === 0) {
        logger.warn('Atomic deduction failed (insufficient credits)', {
          userId: user.id,
        });
        throw new InsufficientCreditsError(
          'موجودی شما پیش از کسر اعتبار به اتمام رسیده است.'
        );
      }
    }

    const storedCarId =
      carId === 'custom'
        ? `custom:${customCarName}:${year}`
        : `${carId}:${year}`;

    // ذخیره عیب‌یابی در دیتابیس
    const insertedDiags = await db
      .insert(diagnostics)
      .values({
        userId: user.id,
        carId: storedCarId,
        description,
        result: resultText,
      })
      .returning({ id: diagnostics.id });

    if (insertedDiags.length === 0) {
      throw new Error('خطا در ذخیره نتیجه عیب‌یابی در دیتابیس');
    }

    logger.info('Diagnose successful', {
      userId: user.id,
      diagnosticId: insertedDiags[0].id,
    });

    return NextResponse.json({
      success: true,
      data: { result: resultText },
      diagnosticId: insertedDiags[0].id,
      // توسعه: اطلاع‌رسانی اعتبار باقی‌مانده به اپلیکیشن
      remainingCredits: !isGoldenActive ? user.credits - 1 : null 
    });
  } catch (error) {
    return handleError(error);
  }
}
