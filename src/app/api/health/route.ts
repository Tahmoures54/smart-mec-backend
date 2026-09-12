import { NextResponse } from 'next/server';
import { pingDb } from '@/db';

export async function GET() {
  const started = Date.now();
  let dbOk = false;
  let dbError: string | undefined;
  let latencyMs: number | undefined;

  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set');
    }
    latencyMs = await pingDb();
    dbOk = true;
  } catch (error) {
    dbError = error instanceof Error ? error.message : 'database error';
    latencyMs = Date.now() - started;
  }

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
    },
  };

  return NextResponse.json(payload, { status: dbOk ? 200 : 503 });
}
