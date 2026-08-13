// ═══════════════════════════════════════════════════════════
// Withdrawal Request (manual payout) - Smart-MEC
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, withdrawals } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getUserFromRequest } from '@/lib/auth';
import { handleError, BadRequestError } from '@/lib/error-handler';
import { RateLimiter } from '@/lib/rate-limiter';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    const list = await db.query.withdrawals.findMany({
      where: eq(withdrawals.userId, user.id),
      orderBy: [desc(withdrawals.createdAt)],
    });
    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = RateLimiter.getIP(request);
    RateLimiter.check(ip, 'withdraw', 5, 60 * 60 * 1000);

    const user = await getUserFromRequest(request);
    const body = await request.json();

    const amount = Number(body.amount);
    const cardNumber = String(body.cardNumber || '')
      .replace(/\s|-/g, '')
      .trim();
    const fullName = String(body.fullName || '').trim();

    const minWithdrawal = parseInt(process.env.MIN_WITHDRAWAL || '50000', 10);

    if (!Number.isInteger(amount) || amount < minWithdrawal) {
      throw new BadRequestError(
        `حداقل مبلغ برداشت ${minWithdrawal.toLocaleString('fa-IR')} تومان است`
      );
    }

    if (amount > (user.earnings ?? 0)) {
      throw new BadRequestError('موجودی درآمد شما کافی نیست');
    }

    if (!/^\d{16}$/.test(cardNumber) && !/^IR\d{24}$/i.test(cardNumber)) {
      throw new BadRequestError(
        'شماره کارت ۱۶ رقمی یا شبا (IR + ۲۴ رقم) وارد کنید'
      );
    }

    if (fullName.length < 3) {
      throw new BadRequestError('نام صاحب حساب الزامی است');
    }

    // درخواست باز pending نداشته باشد
    const pending = await db.query.withdrawals.findFirst({
      where: and(
        eq(withdrawals.userId, user.id),
        eq(withdrawals.status, 'pending')
      ),
    });
    if (pending) {
      throw new BadRequestError(
        'یک درخواست برداشت در انتظار بررسی دارید. تا تعیین تکلیف صبر کنید.'
      );
    }

    // قفل مبلغ از earnings
    const newEarnings = (user.earnings ?? 0) - amount;
    await db
      .update(users)
      .set({
        earnings: newEarnings,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, user.id));

    const [row] = (await db
      .insert(withdrawals)
      .values({
        userId: user.id,
        amount,
        cardNumber,
        fullName,
        status: 'pending',
      })
      .returning()) as any[];

    return NextResponse.json({
      success: true,
      message:
        'درخواست برداشت ثبت شد. پس از بررسی ادمین، واریز دستی انجام می‌شود.',
      data: row,
    });
  } catch (error) {
    return handleError(error);
  }
}
