// ═══════════════════════════════════════════════════════════
// Middleware - Smart-MEC
// ═══════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { applyCorsHeaders } from '@/lib/cors';
import { isProtectedApiPath } from '@/lib/api-guard';
import { ENAMAD_PASS_HEADER, injectEnamadMeta, isEnamadCrawler } from '@/lib/enamad';

function withCors(request: NextRequest, response: NextResponse): NextResponse {
  applyCorsHeaders(request, response);
  return response;
}

async function withEnamadHomepage(request: NextRequest): Promise<NextResponse> {
  if (request.headers.get(ENAMAD_PASS_HEADER) === '1') {
    return NextResponse.next();
  }

  if (isEnamadCrawler(request.headers.get('user-agent'))) {
    return NextResponse.rewrite(new URL('/enamad-verify', request.url));
  }

  try {
    const headers = new Headers(request.headers);
    headers.set(ENAMAD_PASS_HEADER, '1');
    const originRes = await fetch(request.nextUrl, {
      method: 'GET',
      headers,
      redirect: 'manual',
    });
    const contentType = originRes.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return new NextResponse(originRes.body, {
        status: originRes.status,
        headers: originRes.headers,
      });
    }
    const html = injectEnamadMeta(await originRes.text());
    const out = new Headers(originRes.headers);
    out.delete('content-encoding');
    out.delete('content-length');
    return new NextResponse(html, { status: originRes.status, headers: out });
  } catch {
    return NextResponse.next();
  }
}

export async function middleware(request: NextRequest) {
  if (
    request.nextUrl.pathname === '/' &&
    (request.method === 'GET' || request.method === 'HEAD')
  ) {
    return withEnamadHomepage(request);
  }

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
  matcher: ['/', '/api/:path*'],
};
