import { NextResponse } from 'next/server';
import { ENAMAD_LOGO_SRC } from '@/lib/enamad';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

/** پروکسی لوگو اینماد — جلوگیری از باکس سفید به‌خاطر بلاک هات‌لینک */
export async function GET() {
  try {
    const res = await fetch(ENAMAD_LOGO_SRC, {
      headers: {
        Referer: 'https://smart-mec.ir/',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return new NextResponse('Enamad logo unavailable', { status: 502 });
    }

    const buf = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'image/png';

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return new NextResponse('Enamad logo error', { status: 502 });
  }
}
