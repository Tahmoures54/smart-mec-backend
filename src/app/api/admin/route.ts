import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import {
  users,
  purchases,
  withdrawals,
  diagnostics,
  garages,
  feedbacks,
  analyticsEvents,
} from '@/db/schema';
import { eq, desc, sql, like, or, and } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { handleError, BadRequestError, NotFoundError } from '@/lib/error-handler';
import { logger } from '@/utils/logger';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const url = new URL(request.url);
    const section = url.searchParams.get('section') || 'dashboard';

    if (section === 'dashboard') {
      const userCount = await db.select({ c: sql<number>`count(*)` }).from(users);
      const purchaseSum = await db
        .select({
          c: sql<number>`count(*)`,
          s: sql<number>`coalesce(sum(case when status='completed' then amount else 0 end),0)`,
        })
        .from(purchases);
      const diagCount = await db.select({ c: sql<number>`count(*)` }).from(diagnostics);
      const pendingWithdrawals = await db
        .select({ c: sql<number>`count(*)` })
        .from(withdrawals)
        .where(eq(withdrawals.status, 'pending'));
      const totalEarningsHeld = await db
        .select({ s: sql<number>`coalesce(sum(earnings),0)` })
        .from(users);
      const garageStats = await db
        .select({
          total: sql<number>`count(*)`,
          featured: sql<number>`coalesce(sum(case when is_featured then 1 else 0 end),0)`,
          active: sql<number>`coalesce(sum(case when is_active then 1 else 0 end),0)`,
        })
        .from(garages);
      const feedbackCount = await db
        .select({ c: sql<number>`count(*)` })
        .from(feedbacks);

      let funnel: Record<string, number> = {};
      try {
        const rows = await db
          .select({
            event: analyticsEvents.event,
            c: sql<number>`count(*)`,
          })
          .from(analyticsEvents)
          .where(sql`${analyticsEvents.createdAt} > NOW() - INTERVAL '7 days'`)
          .groupBy(analyticsEvents.event);
        for (const r of rows) funnel[r.event] = Number(r.c);
      } catch {
        funnel = {};
      }

      return NextResponse.json({
        success: true,
        data: {
          users: Number(userCount[0]?.c ?? 0),
          purchases: Number(purchaseSum[0]?.c ?? 0),
          revenue: Number(purchaseSum[0]?.s ?? 0),
          diagnostics: Number(diagCount[0]?.c ?? 0),
          pendingWithdrawals: Number(pendingWithdrawals[0]?.c ?? 0),
          totalReferralEarnings: Number(totalEarningsHeld[0]?.s ?? 0),
          garages: Number(garageStats[0]?.total ?? 0),
          garagesFeatured: Number(garageStats[0]?.featured ?? 0),
          garagesActive: Number(garageStats[0]?.active ?? 0),
          feedback: Number(feedbackCount[0]?.c ?? 0),
          funnel7d: funnel,
        },
      });
    }

    if (section === 'users') {
      const q = (url.searchParams.get('q')?.trim() || '').replace(/[%_]/g, '');
      let list;
      if (q) {
        list = await db.query.users.findMany({
          where: or(like(users.phone, `%${q}%`), like(users.referralCode, `%${q}%`)),
          orderBy: [desc(users.id)],
          limit: 100,
        });
      } else {
        list = await db.query.users.findMany({ orderBy: [desc(users.id)], limit: 100 });
      }
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
        })
        .from(purchases)
        .orderBy(desc(purchases.id))
        .limit(100);
      return NextResponse.json({ success: true, data: list });
    }

    if (section === 'withdrawals') {
      const status = url.searchParams.get('status') || 'pending';
      const list = await db
        .select()
        .from(withdrawals)
        .where(eq(withdrawals.status, status))
        .orderBy(desc(withdrawals.id))
        .limit(100);
      return NextResponse.json({ success: true, data: list });
    }

    if (section === 'garages') {
      const list = await db.select().from(garages).orderBy(desc(garages.id)).limit(200);
      return NextResponse.json({ success: true, data: list });
    }

    if (section === 'diagnostics') {
      const list = await db.select().from(diagnostics).orderBy(desc(diagnostics.id)).limit(100);
      return NextResponse.json({ success: true, data: list });
    }

    throw new BadRequestError('section نامعتبر');
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const action = String(body.action || '');

    if (action === 'resolve_withdrawal') {
      const id = Number(body.withdrawalId);
      const status = String(body.status);
      if (!id || !['paid', 'rejected'].includes(status)) throw new BadRequestError('پارامتر نامعتبر');
      await db
        .update(withdrawals)
        .set({ status, adminNote: body.adminNote || null, updatedAt: new Date() })
        .where(eq(withdrawals.id, id));
      return NextResponse.json({ success: true });
    }

    if (action === 'adjust_user') {
      const userId = Number(body.userId);
      if (!userId) throw new BadRequestError('userId الزامی');
      const patch: Record<string, unknown> = { updatedAt: new Date() };
      if (body.credits !== undefined) patch.credits = Number(body.credits);
      if (body.isGolden === true) {
        patch.isGolden = true;
        const days = Number(body.goldenDays || 30);
        const exp = new Date();
        exp.setDate(exp.getDate() + days);
        patch.goldenExpiresAt = exp.toISOString();
      }
      if (body.isGolden === false) {
        patch.isGolden = false;
        patch.goldenExpiresAt = null;
      }
      await db.update(users).set(patch).where(eq(users.id, userId));
      return NextResponse.json({ success: true });
    }

    if (action === 'create_garage' || action === 'update_garage') {
      const values: any = {
        name: String(body.name || '').trim(),
        phone: body.phone ? String(body.phone) : null,
        city: body.city ? String(body.city) : null,
        address: body.address ? String(body.address) : null,
        lat: Number(body.lat),
        lng: Number(body.lng),
        specialties: body.specialties ? String(body.specialties) : null,
        description: body.description ? String(body.description) : null,
        isFeatured: Boolean(body.isFeatured),
        isVerified: Boolean(body.isVerified),
        isActive: body.isActive !== false,
        isOpen: body.isOpen !== false,
        subscriptionTier: body.subscriptionTier || 'free',
        subscriptionExpiresAt: body.subscriptionExpiresAt || null,
        updatedAt: new Date(),
      };
      if (action === 'create_garage') {
        const inserted = await db.insert(garages).values(values).returning();
        return NextResponse.json({ success: true, data: inserted[0] });
      }
      const id = Number(body.id);
      if (!id) throw new BadRequestError('id الزامی');
      await db.update(garages).set(values).where(eq(garages.id, id));
      return NextResponse.json({ success: true });
    }

    if (action === 'toggle_garage') {
      const id = Number(body.id);
      const field = String(body.field || '');
      if (!id || !['isFeatured', 'isVerified', 'isActive'].includes(field)) {
        throw new BadRequestError('پارامتر نامعتبر');
      }
      const found = await db.select().from(garages).where(eq(garages.id, id)).limit(1);
      if (!found[0]) throw new NotFoundError('تعمیرگاه یافت نشد');
      const cur = (found[0] as any)[field];
      await db
        .update(garages)
        .set({ [field]: !cur, updatedAt: new Date() } as any)
        .where(eq(garages.id, id));
      return NextResponse.json({ success: true });
    }

    if (action === 'delete_garage') {
      const id = Number(body.id);
      if (!id) throw new BadRequestError('id الزامی');
      await db.update(garages).set({ isActive: false, updatedAt: new Date() }).where(eq(garages.id, id));
      return NextResponse.json({ success: true });
    }

    throw new BadRequestError('action نامعتبر');
  } catch (e) {
    return handleError(e);
  }
}
