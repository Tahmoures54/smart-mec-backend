import { NextResponse } from 'next/server';
import { ensureDbReady, db } from '@/db';
import { sql } from 'drizzle-orm';

export async function GET() {
  const started = Date.now();
  let dbOk = false;
  let dbError: string | null = null;

  try {
    await ensureDbReady();
    await db.execute(sql`SELECT 1`);
    dbOk = true;
  } catch (err: any) {
    dbError = err?.message || 'unknown db error';
  }

  const latencyMs = Date.now() - started;
  const status = dbOk ? 'ok' : 'degraded';

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      latencyMs,
      checks: {
        database: dbOk ? 'up' : 'down',
        ...(dbError && { databaseError: dbError }),
      },
      version: process.env.npm_package_version || '1.0.0',
    },
    { status: dbOk ? 200 : 503 }
  );
}
