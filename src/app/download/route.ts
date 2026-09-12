import { NextResponse } from 'next/server';
import { primaryDownloadHref } from '@/lib/site';

export function GET(request: Request) {
  const href = primaryDownloadHref();
  const target = href.startsWith('http') ? href : new URL(href, request.url).toString();
  return NextResponse.redirect(target);
}
