// ═══════════════════════════════════════════════════════════
// Middleware - Smart-MEC
// ═══════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { applyCorsHeaders } from '@/lib/cors';
import { isProtectedApiPath } from '@/lib/api-guard';

function withCors(request: NextRequest, response: NextResponse): NextResponse {
  applyCorsHeaders(request, response);
  return response;
}

export async function middleware(request: NextRequest) {
  if (request.method === 'OPTIONS') {
    return withCors(request, new NextResponse(null, { status: 204 }));
  }

  if (isProtectedApiPath(request.nextUrl.pathname)) {
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
