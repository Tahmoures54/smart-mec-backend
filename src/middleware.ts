// ═══════════════════════════════════════════════════════════
// Middleware - Smart-MEC
// ═══════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { applyCorsHeaders } from '@/lib/cors';

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
  '/api/feedback',
  '/api/v1/feedback',
];

/** کال‌بک درگاه پرداخت نباید توکن بخواهد */
const publicExactOrPrefix = [
  '/api/purchase/verify',
  '/api/v1/purchase/verify',
];

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function isPublicCallback(pathname: string): boolean {
  return publicExactOrPrefix.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function isProtectedPath(pathname: string): boolean {
  if (isPublicCallback(pathname)) return false;
  return protectedPrefixes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function withCors(request: NextRequest, response: NextResponse): NextResponse {
  applyCorsHeaders(request, response);
  return response;
}

export async function middleware(request: NextRequest) {
  const pathname = normalizePath(request.nextUrl.pathname);

  if (request.method === 'OPTIONS') {
    return withCors(request, new NextResponse(null, { status: 204 }));
  }

  if (isProtectedPath(pathname)) {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return withCors(
        request,
        NextResponse.json(
          { success: false, error: 'توکن احراز هویت یافت نشد' },
          { status: 401 }
        )
      );
    }

    const token = authHeader.split(' ')[1];
    const systemToken = process.env.ADMIN_SYSTEM_TOKEN;

    if (systemToken && token === systemToken) {
      return withCors(request, NextResponse.next());
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return withCors(
        request,
        NextResponse.json(
          { success: false, error: 'پیکربندی سرور ناقص است' },
          { status: 500 }
        )
      );
    }

    try {
      await jwtVerify(token, new TextEncoder().encode(secret));
      return withCors(request, NextResponse.next());
    } catch {
      return withCors(
        request,
        NextResponse.json(
          { success: false, error: 'توکن نامعتبر یا منقضی شده است' },
          { status: 401 }
        )
      );
    }
  }

  return withCors(request, NextResponse.next());
}

export const config = {
  matcher: ['/api/:path*'],
};
