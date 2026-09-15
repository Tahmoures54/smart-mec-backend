import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDbReady } from '@/db';
import { garages } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { handleError, BadRequestError, NotFoundError } from '@/lib/error-handler';
import { logger } from '@/utils/logger';
import { ensureGarageChatColumns } from '@/lib/ensure-garage-chat-columns';

/** POST { action: 'approve' | 'reject', id: number } */
export async function POST(request: NextRequest) {
  try {
    await ensureDbReady();
    await ensureGarageChatColumns();
    await requireAdmin(request);
    const body = await request.json();
    const action = String(body.action || '');
    const id = Number(body.id);
    if (!id) throw new BadRequestError('شناسه تعمیرگاه الزامی است');
    if (!['approve', 'reject'].includes(action)) {
      throw new BadRequestError('action باید approve یا reject باشد');
    }

    const found = await db.select().from(garages).where(eq(garages.id, id)).limit(1);
    const existing = found[0];
    if (!existing) throw new NotFoundError('تعمیرگاه یافت نشد');

    if (action === 'reject') {
      await db
        .update(garages)
        .set({ chatStatus: 'rejected', showInChat: false, updatedAt: new Date() })
        .where(eq(garages.id, id));
      logger.info(`Admin rejected garage chat promo ${id}`);
      return NextResponse.json({ success: true, message: 'رد شد' });
    }

    const status = existing.chatStatus || 'none';
    if (status !== 'pending_review' && status !== 'approved') {
      throw new BadRequestError(
        'فقط بعد از پرداخت پکیج معرفی (وضعیت pending_review) می‌توان تأیید کرد'
      );
    }

    await db
      .update(garages)
      .set({
        chatStatus: 'approved',
        showInChat: true,
        isVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(garages.id, id));
    logger.info(`Admin approved garage chat promo ${id}`);
    return NextResponse.json({
      success: true,
      message: 'برای نمایش در چت تأیید شد',
    });
  } catch (error) {
    return handleError(error);
  }
}
