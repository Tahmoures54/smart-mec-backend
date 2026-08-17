// ═══════════════════════════════════════════════════════════
// Admin API - Smart-MEC
// فقط شماره ADMIN_PHONE (پیش‌فرض 09160684552)
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, purchases, withdrawals, diagnostics } from '@/db/schema';
import { eq, desc, sql, like, or } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { handleError, BadRequestError, NotFoundError } from '@/lib/error-handler';
import { logger } from '@/utils/logger';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const url = new URL(request.url);
    const section = url.searchParams.get('section') || 'dashboard';

    if (section === 'dashboard') {
      const userCount = await db
        .select({ c: sql<number>`count(*)` })
        .from(users);
      const purchaseSum = await db
        .select({
          c: sql<number>`count(*)`,
          s: sql<number>`coalesce(sum(case when status='completed' then amount else 0 end),0)`,
        })
        .from(purchases);
      const diagCount = await db
        .select({ c: sql<number>`count(*)` })
        .from(diagnostics);
      const pendingWithdrawals = await db
        .select({ c: sql<number>`count(*)` })
        .from(withdrawals)
        .where(eq(withdrawals.status, 'pending'));
      const totalEarningsHeld = await db
        .select({ s: sql<number>`coalesce(sum(earnings),0)` })
        .from(users);

      return NextResponse.json({
        success: true,
        data: {
          users: Number(userCount[0]?.c ?? 0),
          purchases: Number(purchaseSum[0]?.c ?? 0),
          revenue: Number(purchaseSum[0]?.s ?? 0),
          diagnostics: Number(diagCount[0]?.c ?? 0),
          pendingWithdrawals: Number(pendingWithdrawals[0]?.c ?? 0),
          totalReferralEarnings: Number(totalEarningsHeld[0]?.s ?? 0),
        },
      });
    }

    if (section === 'users') {
      const q = url.searchParams.get('q')?.trim();
      let list;
      if (q) {
        list = await db.query.users.findMany({
          where: or(
            like(users.phone, `%${q}%`),
            like(users.referralCode, `%${q}%`)
          ),
          orderBy: [desc(users.id)],
          limit: 100,
        });
      } else {
        list = await db.query.users.findMany({
          orderBy: [desc(users.id)],
          limit: 100,
        });
      }

      const enriched = await Promise.all(
        list.map(async (u) => {
          const cnt = await db
            .select({ c: sql<number>`count(*)` })
            .from(users)
            .where(eq(users.referredBy, u.id));
          return {
            ...u,
            referredCount: Number(cnt[0]?.c ?? 0),
          };
        })
      );

      return NextResponse.json({ success: true, data: enriched });
    }

    if (section === 'withdrawals') {
      const status = url.searchParams.get('status') || 'pending';
      const baseSelect = {
        id: withdrawals.id,
        userId: withdrawals.userId,
        amount: withdrawals.amount,
        cardNumber: withdrawals.cardNumber,
        fullName: withdrawals.fullName,
        status: withdrawals.status,
        adminNote: withdrawals.adminNote,
        createdAt: withdrawals.createdAt,
        updatedAt: withdrawals.updatedAt,
        phone: users.phone,
        referralCode: users.referralCode,
      };

      const list =
        status === 'all'
          ? await db
              .select(baseSelect)
              .from(withdrawals)
              .leftJoin(users, eq(withdrawals.userId, users.id))
              .orderBy(desc(withdrawals.createdAt))
              .limit(100)
          : await db
              .select(baseSelect)
              .from(withdrawals)
              .leftJoin(users, eq(withdrawals.userId, users.id))
              .where(eq(withdrawals.status, status))
              .orderBy(desc(withdrawals.createdAt))
              .limit(100);

      return NextResponse.json({ success: true, data: list });
    }

    if (section === 'purchases') {
      const list = await db
        .select({
          id: purchases.id,
          userId: purchases.userId,
          productId: purchases.productId,
          amount: purchases.amount,
          status: purchases.status,
          createdAt: purchases.createdAt,
          phone: users.phone,
        })
        .from(purchases)
        .leftJoin(users, eq(purchases.userId, users.id))
        .orderBy(desc(purchases.createdAt))
        .limit(100);

      return NextResponse.json({ success: true, data: list });
    }

    throw new BadRequestError('section نامعتبر');
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const { action } = body;

    if (action === 'resolve_withdrawal') {
      const { withdrawalId, status, adminNote } = body;
      if (!['paid', 'rejected'].includes(status)) {
        throw new BadRequestError('status باید paid یا rejected باشد');
      }

      const w = await db.query.withdrawals.findFirst({
        where: eq(withdrawals.id, Number(withdrawalId)),
      });
      if (!w || w.status !== 'pending') {
        throw new NotFoundError('درخواست برداشت یافت نشد یا قبلاً بررسی شده');
      }

      if (status === 'rejected') {
        await db
          .update(users)
          .set({
            earnings: sql`${users.earnings} + ${w.amount}`,
            updatedAt: new Date(), // اصلاح شد
          })
          .where(eq(users.id, w.userId));
      }

      await db
        .update(withdrawals)
        .set({
          status,
          adminNote: adminNote || null,
          updatedAt: new Date(), // اصلاح شد
        })
        .where(eq(withdrawals.id, w.id));

      logger.info(`Admin resolved withdrawal ${w.id} -> ${status}`);
      return NextResponse.json({ success: true, message: 'وضعیت بروزرسانی شد' });
    }

    if (action === 'adjust_user') {
      const { userId, credits, isGolden, goldenDays, earnings } = body;
      const u = await db.query.users.findFirst({
        where: eq(users.id, Number(userId)),
      });
      if (!u) throw new NotFoundError('کاربر یافت نشد');

      const patch: Record<string, any> = {
        updatedAt: new Date(), // اصلاح شد
      };
      if (typeof credits === 'number') patch.credits = credits;
      if (typeof earnings === 'number') patch.earnings = earnings;
      if (typeof isGolden === 'boolean') {
        patch.isGolden = isGolden;
        if (isGolden && goldenDays) {
          const base = Date.now();
          patch.goldenExpiresAt = new Date(
            base + Number(goldenDays) * 86400000
          ).toISOString();
        }
        if (!isGolden) patch.goldenExpiresAt = null;
      }

      await db.update(users).set(patch).where(eq(users.id, u.id));
      logger.info(`Admin adjusted user ${u.id}`, patch);
      return NextResponse.json({ success: true, message: 'کاربر بروزرسانی شد' });
    }

    throw new BadRequestError('action نامعتبر');
  } catch (error) {
    return handleError(error);
  }
}
