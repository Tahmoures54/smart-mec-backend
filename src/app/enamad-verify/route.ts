import { enamadVerifyHtml } from '@/lib/enamad';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

function verifyPage() {
  return new Response(enamadVerifyHtml(), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate',
    },
  });
}

export function GET() {
  return verifyPage();
}

export function HEAD() {
  return verifyPage();
}
