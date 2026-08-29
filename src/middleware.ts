// ═══════════════════════════════════════════════════════════
// Middleware - Smart-MEC
// ═══════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

/** مسیرهای محافظت‌شده (با و بدون پیشوند /v1) */
const protectedPrefixes = [
  '/api/diagnose',
  '/api/v1/diagnose',
  '/api/purchase',
  '/api/v1/purchase',
  '/api/account/credits',
  '/api/v1/account/credits',
  '/api/account/withdraw',
  '/api/v1/account/withdraw',
  '/api/admin',
  '/api/v1/admin',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedPrefixes.some((route) =>
    pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isProtected) {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'توکن احراز هویت یافت نشد' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const systemToken = process.env.ADMIN_SYSTEM_TOKEN;

    if (systemToken && token === systemToken) {
      return NextResponse.next();
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return NextResponse.json(
        { success: false, error: 'پیکربندی سرور ناقص است' },
        { status: 500 }
      );
    }

    try {
      await jwtVerify(token, new TextEncoder().encode(secret));
      return NextResponse.next();
    } catch {
      return NextResponse.json(
        { success: false, error: 'توکن نامعتبر یا منقضی شده است' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
