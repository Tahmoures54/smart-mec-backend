// ═══════════════════════════════════════════════════════════
// Middleware - Smart-MEC
// ═══════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const protectedRoutes = [
  '/api/diagnose',
  '/api/purchase',
  '/api/account/credits',
  '/api/account/withdraw',
  '/api/admin',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
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

    // توکن سیستمی ادمین
    if (systemToken && token === systemToken) {
      return NextResponse.next();
    }

    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
      await jwtVerify(token, secret);
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
