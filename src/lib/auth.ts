// ═══════════════════════════════════════════════════════════
// Authentication Service - Smart-MEC
// ═══════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { UnauthorizedError, ForbiddenError } from './error-handler';
import { JWTPayload, User } from '@/types';

const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  return new TextEncoder().encode(secret);
};

export async function signToken(payload: JWTPayload): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getJwtSecretKey());

  return token;
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    return payload as unknown as JWTPayload;
  } catch {
    throw new UnauthorizedError('توکن نامعتبر یا منقضی شده است');
  }
}

export function getTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

export async function getUserFromRequest(req: NextRequest): Promise<User> {
  const token = getTokenFromRequest(req);
  if (!token) {
    throw new UnauthorizedError('توکن احراز هویت یافت نشد');
  }

  const payload = await verifyToken(token);

  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.userId),
  });

  if (!user) {
    throw new UnauthorizedError('کاربر یافت نشد');
  }

  return user as User;
}

/** شماره ادمین از env — پیش‌فرض همان شماره مالک */
export function getAdminPhone(): string {
  return (process.env.ADMIN_PHONE || '09160684552').replace(/\s/g, '');
}

export function isAdminPhone(phone: string): boolean {
  return phone === getAdminPhone();
}

/** کاربر ادمین از JWT */
export async function requireAdmin(req: NextRequest): Promise<User> {
  // توکن سیستمی
  const token = getTokenFromRequest(req);
  const systemToken = process.env.ADMIN_SYSTEM_TOKEN;
  if (token && systemToken && token === systemToken) {
    // کاربر مجازی ادمین
    return {
      id: 0,
      phone: getAdminPhone(),
      credits: 9999,
      isGolden: true,
      createdAt: new Date().toISOString(),
    } as User;
  }

  const user = await getUserFromRequest(req);
  if (!isAdminPhone(user.phone)) {
    throw new ForbiddenError('دسترسی ادمین مجاز نیست');
  }
  return user;
}

export function isAdminRequest(req: NextRequest): boolean {
  const token = getTokenFromRequest(req);
  const systemToken = process.env.ADMIN_SYSTEM_TOKEN;
  return token !== null && systemToken !== undefined && token === systemToken;
}
