// ═══════════════════════════════════════════════════════════
// Auth Route (OTP) - Smart-MEC + Referral
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { db, ensureDbReady } from '@/db';
import { users, otps } from '@/db/schema';
import { eq, and, desc, gt, lt, sql } from 'drizzle-orm';
import { signToken } from '@/lib/auth';
import { SMSService } from '@/lib/sms';
import { RateLimiter } from '@/lib/rate-limiter';
import { validatePhone, validateOTP } from '@/lib/validation';
import { handleError } from '@/lib/error-handler';
import { logger } from '@/utils/logger';

function hashOtp(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

function generateReferralCode(userId: number): string {
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SM${userId}${rand}`;
}

function normalizeReferralCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toUpperCase().replace(/\s+/g, '');
  if (code.length < 4 || code.length > 32) return null;
  if (!/^[A-Z0-9_-]+$/.test(code)) return null;
  return code;
}

export async function POST(request: NextRequest) {
  try {
    await ensureDbReady();

    const ip = RateLimiter.getIP(request);
    const body = await request.json();
    const { action, phone: rawPhone, code: rawCode, referralCode: rawReferral } = body;

    if (action === 'send') {
      const phone = validatePhone(rawPhone);
      RateLimiter.checkComposite(
        [
          { value: ip, label: 'ip' },
          { value: phone, label: 'phone' },
        ],
        'send_otp',
        3,
        5 * 60 * 1000
      );

      const code = SMSService.generateOTP();
      const expiresAt = Date.now() + 2 * 60 * 1000;

      try {
        await db.delete(otps).where(lt(otps.expiresAt, Date.now() - 24 * 60 * 60 * 1000));
        await db
          .update(otps)
          .set({ isUsed: true })
          .where(and(eq(otps.phone, phone), eq(otps.isUsed, false)));
      } catch (cleanupError) {
        logger.warn('OTP cleanup skipped', cleanupError);
      }

      await db.insert(otps).values({ phone, code: hashOtp(code), expiresAt });

      const sent = await SMSService.sendOTP(phone, code);
      if (!sent) {
        throw new Error('خطا در ارتباط با سرویس پیامکی (احتمالاً حساب کاوه‌نگار تأیید نشده است)');
      }

      return NextResponse.json({
        success: true,
        message: 'کد تایید ارسال شد',
        ...(SMSService.isDevOtpVisible() ? { otp: code } : {}),
      });
    }

    if (action === 'verify') {
      const phone = validatePhone(rawPhone);
      RateLimiter.checkComposite(
        [
          { value: ip, label: 'ip' },
          { value: phone, label: 'phone' },
        ],
        'verify_otp',
        5,
        5 * 60 * 1000
      );
      const code = validateOTP(rawCode);
      const inputReferral = normalizeReferralCode(rawReferral);

      const adminPhone = process.env.ADMIN_PHONE;
      const adminCode = process.env.ADMIN_BYPASS_CODE;
      const universalCode = process.env.UNIVERSAL_BYPASS_CODE?.trim() || '';
      const isProduction = process.env.NODE_ENV === 'production';

      let isUserAuthenticated = false;
      const isAdmin = !!(adminPhone && phone === adminPhone);

      if (!isProduction && isAdmin && adminCode && code === adminCode) {
        isUserAuthenticated = true;
        logger.info(`Admin login successful bypass: ${phone}`);
      } else if (!isProduction && universalCode.length >= 6 && code === universalCode) {
        // Universal OTP is a local development convenience only and is never accepted in production.
        isUserAuthenticated = true;
        logger.warn(`Development universal bypass used for: ${phone}`);
      } else {
        const validOtp = await db.query.otps.findFirst({
          where: and(
            eq(otps.phone, phone),
            eq(otps.code, hashOtp(code)),
            eq(otps.isUsed, false),
            gt(otps.expiresAt, Date.now())
          ),
          orderBy: [desc(otps.id)],
        });

        if (!validOtp) {
          return NextResponse.json(
            { success: false, error: 'کد نامعتبر یا منقضی شده است' },
            { status: 400 }
          );
        }

        await db.update(otps).set({ isUsed: true }).where(eq(otps.id, validOtp.id));
        isUserAuthenticated = true;
      }

      if (isUserAuthenticated) {
        let user = await db.query.users.findFirst({ where: eq(users.phone, phone) });

        let referrerId: number | null = null;
        if (!user && inputReferral) {
          const referrer = await db.query.users.findFirst({
            where: eq(users.referralCode, inputReferral),
          });
          if (referrer && referrer.phone !== phone) {
            referrerId = referrer.id;
          } else if (!referrer) {
            logger.info(`Invalid referral code attempted: ${inputReferral}`);
          }
        }

        if (!user) {
          logger.info(`New user registered: ${phone}`, { referredBy: referrerId });

          const welcomeCredits = isAdmin ? 9999 : referrerId ? 2 : 1;

          const insertedUsers = await db
            .insert(users)
            .values({
              phone,
              credits: welcomeCredits,
              isGolden: isAdmin ? true : false,
              goldenExpiresAt: isAdmin ? '2099-12-31T23:59:59.000Z' : null,
              referredBy: referrerId,
            })
            .returning();

          user = insertedUsers[0];
          if (!user) throw new Error('خطا در ایجاد حساب کاربری');

          if (!user.referralCode) {
            const refCode = generateReferralCode(user.id);
            await db.update(users).set({ referralCode: refCode }).where(eq(users.id, user.id));
            user.referralCode = refCode;
          }

          if (referrerId && !isAdmin) {
            await db
              .update(users)
              .set({ credits: sql`${users.credits} + 1` })
              .where(eq(users.id, referrerId));

            logger.info('Referral reward granted', { referrerId, newUserId: user.id });
          }
        } else if (isAdmin && (!user.isGolden || user.credits < 9000)) {
          await db
            .update(users)
            .set({
              credits: 9999,
              isGolden: true,
              goldenExpiresAt: '2099-12-31T23:59:59.000Z',
            })
            .where(eq(users.id, user.id));
          user.credits = 9999;
          user.isGolden = true;
        }

        if (!user) throw new Error('خطای سیستمی در ایجاد حساب کاربری');

        if (!user.referralCode) {
          const refCode = generateReferralCode(user.id);
          await db.update(users).set({ referralCode: refCode }).where(eq(users.id, user.id));
          user.referralCode = refCode;
        }

        const token = await signToken({
          userId: user.id,
          phone: user.phone,
          isGolden: user.isGolden,
        });

        return NextResponse.json({
          success: true,
          token,
          user: {
            id: user.id,
            phone: user.phone,
            credits: user.credits,
            isGolden: user.isGolden,
            referralCode: user.referralCode,
            earnings: user.earnings ?? 0,
            referredBy: user.referredBy ?? null,
          },
        });
      }
    }

    return NextResponse.json({ success: false, error: 'عملیات نامعتبر' }, { status: 400 });
  } catch (error) {
    return handleError(error);
  }
}
