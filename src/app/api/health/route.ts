import { NextResponse } from 'next/server';
import { pingDb } from '@/db';
import { getZibalPaymentMode } from '@/lib/zibal';

export async function GET() {
  const started = Date.now();
  let dbOk = false;
  let dbError: string | undefined;
  let latencyMs: number | undefined;

  try {
    // The application uses SQLite (DATABASE_PATH), not PostgreSQL/DATABASE_URL.
    latencyMs = await pingDb();
    dbOk = true;
  } catch (error) {
    dbError = error instanceof Error ? error.message : 'database error';
    latencyMs = Date.now() - started;
  }

  const paymentMode = getZibalPaymentMode();
  const payload = {
    status: dbOk ? 'ok' : 'degraded',
    service: 'smart-mec-backend',
    timestamp: new Date().toISOString(),
    checks: {
      database: {
        ok: dbOk,
        latencyMs,
        error: dbError,
      },
      payment: {
        provider: 'zibal',
        mode: paymentMode,
        configured: paymentMode !== 'unset',
      },
    },
  };

  return NextResponse.json(payload, { status: dbOk ? 200 : 503 });
}
