import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDbReady } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getUserFromRequest } from '@/lib/auth';
import { ensureAnalyticsTables } from '@/lib/ensure-analytics';
import { handleError } from '@/lib/error-handler';

/** POST { optIn: boolean } */
export async function POST(request: NextRequest) {
  try {
    await ensureDbReady();
    await ensureAnalyticsTables();
    const user = await getUserFromRequest(request);
    const body = await request.json().catch(() => ({}));
    const optIn = Boolean(body.optIn);
    await db
      .update(users)
      .set({ marketingOptIn: optIn, updatedAt: new Date() })
      .where(eq(users.id, user.id));
    return NextResponse.json({ success: true, data: { marketingOptIn: optIn } });
  } catch (e) {
    return handleError(e);
  }
}
