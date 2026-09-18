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

type Tx = Pick<typeof db, 'update' | 'insert' | 'select'>;

export type DiagnoseBillingResult = {
  remainingFree: number | null;
  remainingCredits: number | null;
  usedFree: boolean;
};

/** better-sqlite3 همگام است — داخل transaction نباید async باشد */
export function hasFreeQuota(
  userId: number,
  yearMonth: string,
  client: Tx = db
): boolean {
  const existing = client
    .select()
    .from(monthlyFreeUsage)
    .where(
      and(
        eq(monthlyFreeUsage.userId, userId),
        eq(monthlyFreeUsage.yearMonth, yearMonth)
      )
    )
    .get();
  return !existing || existing.freeCount < monthlyFreeLimit();
}

function consumeGolden(tx: Tx, user: User, yearMonth: string, now: Date) {
  const monthlyLimit = user.monthlyLimit ?? 200;
  const limitMessage = `سقف مجاز عیب‌یابی این ماه (${monthlyLimit} درخواست) به پایان رسیده است.`;

  const incremented = tx
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
    .returning()
    .all();

  if (incremented.length > 0) return;

  const existing = tx
    .select()
    .from(goldenUsage)
    .where(
      and(eq(goldenUsage.userId, user.id), eq(goldenUsage.yearMonth, yearMonth))
    )
    .get();

  if (existing) {
    throw new BadRequestError(limitMessage);
  }

  try {
    tx.insert(goldenUsage)
      .values({
        userId: user.id,
        yearMonth,
        count: 1,
        updatedAt: now,
      })
      .run();
  } catch {
    const retried = tx
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
      .returning()
      .all();
    if (retried.length === 0) {
      throw new BadRequestError(limitMessage);
    }
  }
}

function consumeFreeOrCredit(
  tx: Tx,
  user: User,
  yearMonth: string,
  now: Date
): DiagnoseBillingResult {
  const freeLimit = monthlyFreeLimit();
  const freeAvailable = hasFreeQuota(user.id, yearMonth, tx);

  if (freeAvailable) {
    const updated = tx
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
      .returning()
      .all();

    if (updated.length > 0) {
      return {
        remainingFree: Math.max(0, freeLimit - updated[0].freeCount),
        remainingCredits: null,
        usedFree: true,
      };
    }

    const existingFree = tx
      .select()
      .from(monthlyFreeUsage)
      .where(
        and(
          eq(monthlyFreeUsage.userId, user.id),
          eq(monthlyFreeUsage.yearMonth, yearMonth)
        )
      )
      .get();

    if (!existingFree) {
      try {
        tx.insert(monthlyFreeUsage)
          .values({
            userId: user.id,
            yearMonth,
            freeCount: 1,
            updatedAt: now,
          })
          .run();
        return {
          remainingFree: Math.max(0, freeLimit - 1),
          remainingCredits: null,
          usedFree: true,
        };
      } catch {
        // unique race — fall through to credits
      }
    }
  }

  const updateResult = tx
    .update(users)
    .set({ credits: sql`${users.credits} - 1` })
    .where(and(eq(users.id, user.id), gt(users.credits, 0)))
    .returning()
    .all();

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


export function consumeQuestionQuota(
  tx: Tx,
  user: User,
  yearMonth: string,
  now: Date
): DiagnoseBillingResult {
  // Clarification questions cost at most half a paid credit each.
  // The monthly free diagnosis quota remains available for the final diagnosis.
  if (isGoldenActive(user, now) || hasFreeQuota(user.id, yearMonth, tx)) {
    return {
      remainingFree: null,
      remainingCredits: user.credits,
      usedFree: false,
    };
  }

  const updated = tx
    .update(users)
    .set({ credits: sql`${users.credits} - 0.5` })
    .where(and(eq(users.id, user.id), sql`${users.credits} >= 0.5`))
    .returning()
    .all();

  if (updated.length === 0) {
    throw new InsufficientCreditsError(
      'برای ادامهٔ سؤال‌ها حداقل نیم اعتبار لازم است.'
    );
  }

  return {
    remainingFree: 0,
    remainingCredits: updated[0].credits,
    usedFree: false,
  };
}

export function consumeDiagnoseQuota(
  tx: Tx,
  user: User,
  now: Date
): DiagnoseBillingResult {
  const currentMonth = now.toISOString().slice(0, 7);

  if (isGoldenActive(user, now)) {
    consumeGolden(tx, user, currentMonth, now);
    return {
      remainingFree: null,
      remainingCredits: null,
      usedFree: false,
    };
  }

  return consumeFreeOrCredit(tx, user, currentMonth, now);
}

export function saveDiagnostic(
  tx: Tx,
  values: {
    userId: number;
    carId: string;
    description: string;
    result: string;
    audioUrl?: string | null;
  }
): number {
  const inserted = tx
    .insert(diagnostics)
    .values(values)
    .returning({ id: diagnostics.id })
    .all();

  if (!inserted[0]?.id) {
    throw new Error('خطا در ذخیره نتیجه عیب‌یابی در دیتابیس');
  }
  return inserted[0].id;
}
