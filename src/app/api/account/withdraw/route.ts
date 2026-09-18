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

function validIranianCard(value: string): boolean {
  if (!/^\d{16}$/.test(value)) return false;
  if (/^(\d)\1{15}$/.test(value)) return false;
  let sum = 0;
  for (let i = 0; i < 16; i += 1) {
    let n = Number(value[i]);
    if (i % 2 === 0) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

function maskBankAccount(value: string): string {
  if (value.startsWith('IR') && value.length === 26) return 'IR********************' + value.slice(-4);
  return '**** **** **** ' + value.slice(-4);
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    const list = db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.userId, user.id))
      .orderBy(desc(withdrawals.createdAt))
      .all();
    const safeList = list.map((item) => ({ ...item, cardNumber: item.cardNumber ? maskBankAccount(item.cardNumber) : null }));
    return NextResponse.json({ success: true, data: safeList });
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
    const max = Number(process.env.MAX_WITHDRAWAL_TOMAN || '500000000');

    if (!Number.isInteger(amount) || amount < min || amount > max) {
      throw new BadRequestError(
        'مبلغ برداشت باید بین ' + min.toLocaleString('fa-IR') + ' تا ' + max.toLocaleString('fa-IR') + ' تومان باشد'
      );
    }

    if (!validIranianCard(cardNumber) && !/^IR\d{24}$/i.test(cardNumber)) {
      throw new BadRequestError(
        'شماره کارت ۱۶ رقمی یا شبا (IR + ۲۴ رقم) وارد کنید'
      );
    }

    if (fullName.length < 3) {
      throw new BadRequestError('نام صاحب حساب الزامی است');
    }

    const row = db.transaction((tx) => {
      const pending = tx
        .select()
        .from(withdrawals)
        .where(
          and(eq(withdrawals.userId, user.id), eq(withdrawals.status, 'pending'))
        )
        .get();
      if (pending) {
        throw new BadRequestError(
          'یک درخواست برداشت در انتظار بررسی دارید. تا تعیین تکلیف صبر کنید.'
        );
      }

      const deducted = tx
        .update(users)
        .set({
          earnings: sql`${users.earnings} - ${amount}`,
          updatedAt: new Date(),
        })
        .where(and(eq(users.id, user.id), gte(users.earnings, amount)))
        .returning({ earnings: users.earnings })
        .all();

      if (deducted.length === 0) {
        throw new BadRequestError('موجودی درآمد شما کافی نیست');
      }

      const inserted = tx
        .insert(withdrawals)
        .values({
          userId: user.id,
          amount,
          cardNumber,
          fullName,
          status: 'pending',
        })
        .returning()
        .all();

      return inserted[0];
    });

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
