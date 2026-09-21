import { NextResponse } from 'next/server';
import { pingDb } from '@/db';

export async function GET() {
  try {
    await pingDb();
    return NextResponse.json({
      status: 'ok',
      service: 'smart-mec-backend',
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        status: 'degraded',
        service: 'smart-mec-backend',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
