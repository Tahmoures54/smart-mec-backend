// ═══════════════════════════════════════════════════════════
// Middleware - Smart-MEC (Production)
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
  '/api/feedback',
  // نسخه v1 هم از طریق rewrite به همین مسیرها می‌رسد
  '/api/v1/diagnose',
  '/api/v1/purchase',
  '/api/v1/account/credits',
  '/api/v1/account/withdraw',
  '/api/v1/admin',
  '/api/v1/feedback',
];

function corsHeaders(request: NextRequest): HeadersInit {
  const allowed = (
    process.env.ALLOWED_ORIGINS ||
    'https://smart-mec.ir,https://www.smart-mec.ir,http://localhost:3000'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const origin = request.headers.get('origin') || '';
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0] || '*';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Preflight CORS
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(request),
    });
  }

  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtected) {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'توکن احراز هویت یافت نشد' },
        { status: 401, headers: corsHeaders(request) }
      );
    }

    const token = authHeader.split(' ')[1];
    const systemToken = process.env.ADMIN_SYSTEM_TOKEN;

    if (systemToken && token === systemToken) {
      return NextResponse.next();
    }

    if (!process.env.JWT_SECRET) {
      return NextResponse.json(
        { success: false, error: 'پیکربندی سرور ناقص است' },
        { status: 500, headers: corsHeaders(request) }
      );
    }

    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      await jwtVerify(token, secret);
      return NextResponse.next();
    } catch {
      return NextResponse.json(
        { success: false, error: 'توکن نامعتبر یا منقضی شده است' },
        { status: 401, headers: corsHeaders(request) }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
