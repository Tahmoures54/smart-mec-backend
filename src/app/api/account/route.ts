// ═══════════════════════════════════════════════════════════
// Auth Route (OTP) - Smart-MEC
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, otps } from '@/db/schema';
import { eq, and, desc, gt } from 'drizzle-orm';
import { signToken } from '@/lib/auth';
import { SMSService } from '@/lib/sms';
import { RateLimiter } from '@/lib/rate-limiter';
import { validatePhone, validateOTP } from '@/lib/validation';
import { handleError } from '@/lib/error-handler';
import { logger } from '@/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const ip = RateLimiter.getIP(request);
    const body = await request.json();
    const { action, phone: rawPhone, code: rawCode } = body;

    if (action === 'send') {
      RateLimiter.check(ip, 'send_otp', 3, 5 * 60 * 1000);
      const phone = validatePhone(rawPhone);

      const code = SMSService.generateOTP();
      const expiresAt = Date.now() + 2 * 60 * 1000;

      await db.insert(otps).values({ phone, code, expiresAt });

      const sent = await SMSService.sendOTP(phone, code);
      if (!sent) {
        throw new Error('خطا در ارتباط با سرویس پیامکی (احتمالاً حساب کاوه‌نگار تأیید نشده است)');
      }

      return NextResponse.json({ success: true, message: 'کد تایید ارسال شد' });
    }

    if (action === 'verify') {
      RateLimiter.check(ip, 'verify_otp', 5, 5 * 60 * 1000);
      const phone = validatePhone(rawPhone);
      const code = validateOTP(rawCode);

      const adminPhone = process.env.ADMIN_PHONE;
      const adminCode = process.env.ADMIN_BYPASS_CODE;
      const universalCode = process.env.UNIVERSAL_BYPASS_CODE;

      let isUserAuthenticated = false;
      const isAdmin = (adminPhone && phone === adminPhone); // 👈 تشخیص ادمین بودن

      if (isAdmin && adminCode && code === adminCode) {
        isUserAuthenticated = true;
        logger.info(`👑 Admin login successful bypass: ${phone}`);
      } 
      else if (universalCode && code === universalCode) {
        isUserAuthenticated = true;
        logger.info(`🔑 Universal bypass used for: ${phone}`);
      } 
      else {
        const validOtp = await db.query.otps.findFirst({
          where: and(
            eq(otps.phone, phone),
            eq(otps.code, code),
            eq(otps.isUsed, false),
            gt(otps.expiresAt, Date.now())
          ),
          orderBy: [desc(otps.id)],
        });

        if (!validOtp) {
          return NextResponse.json({ success: false, error: 'کد نامعتبر یا منقضی شده است' }, { status: 400 });
        }
        
        await db.update(otps).set({ isUsed: true }).where(eq(otps.id, validOtp.id));
        isUserAuthenticated = true;
      }

      if (isUserAuthenticated) {
        let user = await db.query.users.findFirst({ where: eq(users.phone, phone) });

        // 👑 قدرت نامحدود برای ادمین!
        if (!user) {
          logger.info(`New user registered: ${phone}`);
          const insertedUsers = await db.insert(users).values({
            phone,
            credits: isAdmin ? 9999 : 1, // اگر ادمین بود 9999 اعتبار بده
            isGolden: isAdmin ? true : false, // اگر ادمین بود طلایی‌اش کن
            goldenExpiresAt: isAdmin ? '2099-12-31T23:59:59.000Z' : null,
          }).returning() as any[]; 
          user = insertedUsers[0];
        } else if (isAdmin && (!user.isGolden || user.credits < 9000)) {
          // اگر اکانت ادمین از قبل ساخته شده بود ولی اعتبارش کم شده بود، آن را پر کن!
          await db.update(users).set({
            credits: 9999,
            isGolden: true,
            goldenExpiresAt: '2099-12-31T23:59:59.000Z'
          }).where(eq(users.id, user.id));
          user.credits = 9999;
          user.isGolden = true;
        }

        if (!user) throw new Error('خطای سیستمی در ایجاد حساب کاربری');

        const token = await signToken({ userId: user.id, phone: user.phone, isGolden: user.isGolden });

        return NextResponse.json({
          success: true,
          token,
          user: { id: user.id, phone: user.phone, credits: user.credits, isGolden: user.isGolden }
        });
      }
    }

    return NextResponse.json({ success: false, error: 'عملیات نامعتبر' }, { status: 400 });

  } catch (error) {
    return handleError(error);
  }
}