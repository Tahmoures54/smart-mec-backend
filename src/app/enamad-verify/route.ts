import { enamadVerifyHtml } from '@/lib/enamad';

export function GET() {
  return new Response(enamadVerifyHtml(), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, must-revalidate',
    },
  });
}
