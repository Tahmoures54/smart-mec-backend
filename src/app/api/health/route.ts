import { NextResponse } from 'next/server';
import { pingDb } from '@/db';
import { getZibalPaymentMode } from '@/lib/zibal';
import { productionEnvironmentHealthy, validateProductionEnvironment } from '@/lib/production-env';

export async function GET() {
  const started = Date.now();
  let dbOk = false;
  let dbError: string | undefined;
  let latencyMs: number | undefined;

  try {
    latencyMs = await pingDb();
    dbOk = true;
  } catch (error) {
    dbError = error instanceof Error ? error.message : 'database error';
    latencyMs = Date.now() - started;
  }

  const paymentMode = getZibalPaymentMode();
  const productionHealthy = productionEnvironmentHealthy();
  const payload = {
    status: dbOk && productionHealthy ? 'ok' : 'degraded',
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
        configured: paymentMode === 'live' || paymentMode === 'sandbox',
      },
      production: {
        healthy: productionHealthy,
        ...(process.env.NODE_ENV === 'production'
          ? { checks: validateProductionEnvironment().map(({ key, ok, required, message }) => ({ key, ok, required, message })) }
          : {}),
      },
    },
  };

  return NextResponse.json(payload, { status: dbOk && productionHealthy ? 200 : 503 });
}
