// ═══════════════════════════════════════════════════════════
// Authentication Service - Smart-MEC
// ═══════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { UnauthorizedError } from './error-handler';
import { JWTPayload, User } from '@/types';

const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  return new TextEncoder().encode(secret);
};

/**
 * تولید توکن JWT برای کاربر
 */
export async function signToken(payload: JWTPayload): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d') // انقضای 30 روزه
    .sign(getJwtSecretKey());
  
  return token;
}

/**
 * بررسی و استخراج اطلاعات از توکن
 */
export async function verifyToken(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    return payload as unknown as JWTPayload;
  } catch (error) {
    throw new UnauthorizedError('توکن نامعتبر یا منقضی شده است');
  }
}

/**
 * دریافت توکن از هدر درخواست
 */
export function getTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

/**
 * دریافت کامل شیء کاربر از دیتابیس بر اساس توکن درخواست
 */
export async function getUserFromRequest(req: NextRequest): Promise<User> {
  // ۱. استخراج توکن
  const token = getTokenFromRequest(req);
  if (!token) {
    throw new UnauthorizedError('توکن احراز هویت یافت نشد');
  }

  // ۲. صحت‌سنجی توکن
  const payload = await verifyToken(token);

  // ۳. واکشی کاربر از دیتابیس
  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.userId),
  });

  if (!user) {
    throw new UnauthorizedError('کاربر یافت نشد');
  }

  return user as User;
}

/**
 * بررسی دسترسی ادمین (از طریق سیستم توکن یا شماره موبایل)
 */
export function isAdminRequest(req: NextRequest): boolean {
  const token = getTokenFromRequest(req);
  const systemToken = process.env.ADMIN_SYSTEM_TOKEN;
  
  return token !== null && systemToken !== undefined && token === systemToken;
}