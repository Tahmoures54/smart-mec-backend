import { NextResponse } from 'next/server';
import { primaryDownloadHref } from '@/lib/site';

export function GET(request: Request) {
  const href = primaryDownloadHref();

  if (!href) {
    return NextResponse.json(
      { success: false, error: 'نسخه اندروید هنوز برای دانلود منتشر نشده است.' },
      { status: 404 }
    );
  }

  if (href.startsWith('http://') || href.startsWith('https://')) {
    return NextResponse.redirect(href);
  }

  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost || request.headers.get('host');
  const proto =
    request.headers.get('x-forwarded-proto') ||
    new URL(request.url).protocol.replace(/:$/, '');
  const base = host ? `${proto}://${host}` : request.url;
  return NextResponse.redirect(new URL(href, base).toString());
}
