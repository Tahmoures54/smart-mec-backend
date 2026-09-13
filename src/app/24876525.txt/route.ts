import { emptyEnamadFileResponse } from '@/lib/enamad';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export function GET() {
  return emptyEnamadFileResponse();
}

export function HEAD() {
  return emptyEnamadFileResponse();
}
