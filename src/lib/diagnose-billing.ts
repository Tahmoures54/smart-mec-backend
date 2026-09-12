import { eq, sql, and, gt, lt } from 'drizzle-orm';
import { diagnostics, users, goldenUsage, monthlyFreeUsage } from '@/db/schema';
import {
  InsufficientCreditsError,
  BadRequestError,
} from '@/lib/error-handler';
import { monthlyFreeLimit } from '@/lib/constants';
import { isGoldenActive } from '@/lib/user-status';
import { User } from '@/types';
import { db } from '@/db';

type Tx = Pick<typeof db, 'update' | 'insert' | 'query'>;

export type DiagnoseBillingResult = {
  remainingFree: number | null;
  remainingCredits: number | null;
  usedFree: boolean;
};

export async function hasFreeQuota(
  userId: number,
  yearMonth: string,
  lookup: Tx['query']
): Promise<boolean> {
  const existing = await lookup.monthlyFreeUsage.findFirst({
    where: and(
      eq(monthlyFreeUsage.userId, userId),
      eq(monthlyFreeUsage.yearMonth, yearMonth)
    ),
  });
  return !existing || existing.freeCount < monthlyFreeLimit();
}

async function consumeGolden(tx: Tx, user: User, yearMonth: string, now: Date) {
  const monthlyLimit = user.monthlyLimit ?? 200;
  const limitMessage = `سقف مجاز عیب‌یابی این ماه (${monthlyLimit} درخواست) به پایان رسیده است.`;

  const incremented = await tx
    .update(goldenUsage)
    .set({
      count: sql`${goldenUsage.count} + 1`,
      updatedAt: now,
    })
    .where(
      and(
        eq(goldenUsage.userId, user.id),
        eq(goldenUsage.yearMonth, yearMonth),
        lt(goldenUsage.count, monthlyLimit)
      )
    )
    .returning();

  if (incremented.length > 0) return;

  const existing = await tx.query.goldenUsage.findFirst({
    where: and(
      eq(goldenUsage.userId, user.id),
      eq(goldenUsage.yearMonth, yearMonth)
    ),
  });

  if (existing) {
    throw new BadRequestError(limitMessage);
  }

  try {
    await tx.insert(goldenUsage).values({
      userId: user.id,
      yearMonth,
      count: 1,
      updatedAt: now,
    });
  } catch {
    const retried = await tx
      .update(goldenUsage)
      .set({
        count: sql`${goldenUsage.count} + 1`,
        updatedAt: now,
      })
      .where(
        and(
          eq(goldenUsage.userId, user.id),
          eq(goldenUsage.yearMonth, yearMonth),
          lt(goldenUsage.count, monthlyLimit)
        )
      )
      .returning();
    if (retried.length === 0) {
      throw new BadRequestError(limitMessage);
    }
  }
}

async function consumeFreeOrCredit(
  tx: Tx,
  user: User,
  yearMonth: string,
  now: Date
): Promise<DiagnoseBillingResult> {
  const freeLimit = monthlyFreeLimit();
  const freeAvailable = await hasFreeQuota(user.id, yearMonth, tx.query);

  if (freeAvailable) {
    const updated = await tx
      .update(monthlyFreeUsage)
      .set({
        freeCount: sql`${monthlyFreeUsage.freeCount} + 1`,
        updatedAt: now,
      })
      .where(
        and(
          eq(monthlyFreeUsage.userId, user.id),
          eq(monthlyFreeUsage.yearMonth, yearMonth),
          lt(monthlyFreeUsage.freeCount, freeLimit)
        )
      )
      .returning();

    if (updated.length > 0) {
      return {
        remainingFree: Math.max(0, freeLimit - updated[0].freeCount),
        remainingCredits: null,
        usedFree: true,
      };
    }

    const existingFree = await tx.query.monthlyFreeUsage.findFirst({
      where: and(
        eq(monthlyFreeUsage.userId, user.id),
        eq(monthlyFreeUsage.yearMonth, yearMonth)
      ),
    });

    if (!existingFree) {
      try {
        await tx.insert(monthlyFreeUsage).values({
          userId: user.id,
          yearMonth,
          freeCount: 1,
          updatedAt: now,
        });
        return {
          remainingFree: Math.max(0, freeLimit - 1),
          remainingCredits: null,
          usedFree: true,
        };
      } catch {
        // unique race — fall through to credits or retry below
      }
    }
  }

  const updateResult = await tx
    .update(users)
    .set({ credits: sql`${users.credits} - 1` })
    .where(and(eq(users.id, user.id), gt(users.credits, 0)))
    .returning();

  if (updateResult.length === 0) {
    throw new InsufficientCreditsError(
      'موجودی شما پیش از کسر اعتبار به اتمام رسیده است.'
    );
  }

  return {
    remainingFree: 0,
    remainingCredits: updateResult[0].credits,
    usedFree: false,
  };
}

export async function consumeDiagnoseQuota(
  tx: Tx,
  user: User,
  now: Date
): Promise<DiagnoseBillingResult> {
  const currentMonth = now.toISOString().slice(0, 7);

  if (isGoldenActive(user, now)) {
    await consumeGolden(tx, user, currentMonth, now);
    return {
      remainingFree: null,
      remainingCredits: null,
      usedFree: false,
    };
  }

  return consumeFreeOrCredit(tx, user, currentMonth, now);
}

export async function saveDiagnostic(
  tx: Tx,
  values: {
    userId: number;
    carId: string;
    description: string;
    result: string;
    audioUrl?: string | null;
  }
): Promise<number> {
  const inserted = await tx
    .insert(diagnostics)
    .values(values)
    .returning({ id: diagnostics.id });

  if (!inserted[0]?.id) {
    throw new Error('خطا در ذخیره نتیجه عیب‌یابی در دیتابیس');
  }
  return inserted[0].id;
}
