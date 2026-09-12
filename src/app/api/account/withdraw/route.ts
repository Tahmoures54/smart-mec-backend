// ═══════════════════════════════════════════════════════════
// Withdrawal Request (manual payout) - Smart-MEC
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, withdrawals } from '@/db/schema';
import { eq, and, desc, sql, gte } from 'drizzle-orm';
import { getUserFromRequest } from '@/lib/auth';
import { handleError, BadRequestError } from '@/lib/error-handler';
import { RateLimiter } from '@/lib/rate-limiter';
import { minWithdrawal } from '@/lib/constants';

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
    const min = minWithdrawal();

    if (!Number.isInteger(amount) || amount < min) {
      throw new BadRequestError(
        `حداقل مبلغ برداشت ${min.toLocaleString('fa-IR')} تومان است`
      );
    }

    if (!/^\d{16}$/.test(cardNumber) && !/^IR\d{24}$/i.test(cardNumber)) {
      throw new BadRequestError(
        'شماره کارت ۱۶ رقمی یا شبا (IR + ۲۴ رقم) وارد کنید'
      );
    }

    if (fullName.length < 3) {
      throw new BadRequestError('نام صاحب حساب الزامی است');
    }

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

    const deducted = await db
      .update(users)
      .set({
        earnings: sql`${users.earnings} - ${amount}`,
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, user.id), gte(users.earnings, amount)))
      .returning({ earnings: users.earnings });

    if (deducted.length === 0) {
      throw new BadRequestError('موجودی درآمد شما کافی نیست');
    }

    try {
      const [row] = await db
        .insert(withdrawals)
        .values({
          userId: user.id,
          amount,
          cardNumber,
          fullName,
          status: 'pending',
        })
        .returning();

      return NextResponse.json({
        success: true,
        message:
          'درخواست برداشت ثبت شد. پس از بررسی ادمین، واریز دستی انجام می‌شود.',
        data: row,
      });
    } catch (insertError) {
      await db
        .update(users)
        .set({
          earnings: sql`${users.earnings} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
      throw insertError;
    }
  } catch (error) {
    return handleError(error);
  }
}
