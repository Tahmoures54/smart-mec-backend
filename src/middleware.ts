// ═══════════════════════════════════════════════════════════
// Middleware - Smart-MEC
// ═══════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// مسیرهایی که نیاز به احراز هویت دارند
const protectedRoutes = [
  '/api/diagnose',
  '/api/purchase',
  '/api/account/credits',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // بررسی می‌کنیم آیا مسیر فعلی جزو مسیرهای محافظت‌شده است؟
  const isProtected = protectedRoutes.some(route => pathname.startsWith(route));

  if (isProtected) {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'توکن احراز هویت یافت نشد' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      // استفاده از jose چون در محیط Edge (Middleware) فقط این کتابخانه کار می‌کند
      const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
      await jwtVerify(token, secret);
      
      return NextResponse.next();
    } catch (error) {
      return NextResponse.json({ success: false, error: 'توکن نامعتبر یا منقضی شده است' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};