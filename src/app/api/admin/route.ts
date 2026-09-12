// Admin API - Smart-MEC

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import {
  users,
  purchases,
  withdrawals,
  diagnostics,
  garages,
  feedbacks,
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
      const enriched = await Promise.all(
        list.map(async (u) => {
          const refs = await db
            .select({ c: sql<number>`count(*)` })
            .from(users)
            .where(eq(users.referredBy, u.id));
          return { ...u, referralCount: Number(refs[0]?.c ?? 0), referredCount: Number(refs[0]?.c ?? 0) };
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

    if (section === 'diagnostics') {
      const list = await db
        .select({
          id: diagnostics.id,
          userId: diagnostics.userId,
          phone: users.phone,
          carId: diagnostics.carId,
          description: diagnostics.description,
          result: diagnostics.result,
          createdAt: diagnostics.createdAt,
        })
        .from(diagnostics)
        .leftJoin(users, eq(diagnostics.userId, users.id))
        .orderBy(desc(diagnostics.createdAt))
        .limit(50);

      const data = list.map((row) => ({
        id: row.id,
        userId: row.userId,
        phone: row.phone,
        carId: row.carId,
        description: (row.description || '').slice(0, 180),
        resultPreview: (row.result || '').slice(0, 220),
        createdAt: row.createdAt,
      }));
      return NextResponse.json({ success: true, data });
    }

    if (section === 'garages') {
      const q = url.searchParams.get('q')?.trim() || '';
      const rows = await db
        .select()
        .from(garages)
        .orderBy(desc(garages.isFeatured), desc(garages.id))
        .limit(200);
      let list = rows;
      if (q) {
        const qq = q.toLowerCase();
        list = rows.filter(
          (g) =>
            g.name.toLowerCase().includes(qq) ||
            (g.address || '').toLowerCase().includes(qq) ||
            (g.city || '').toLowerCase().includes(qq) ||
            (g.phone || '').includes(q)
        );
      }
      const data = list.map((g) => ({
        id: g.id,
        name: g.name,
        address: g.address,
        phone: g.phone,
        lat: g.lat,
        lng: g.lng,
        rating: g.rating,
        reviewsCount: g.reviewsCount,
        specialties: g.specialties,
        photoUrl: g.photoUrl,
        website: g.website,
        description: g.description,
        isOpen: g.isOpen,
        isFeatured: g.isFeatured,
        isVerified: g.isVerified,
        isActive: g.isActive,
        subscriptionTier: g.subscriptionTier || 'free',
        subscriptionExpiresAt: g.subscriptionExpiresAt,
        city: g.city,
        createdAt: g.createdAt,
      }));
      return NextResponse.json({ success: true, data });
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
      const claimed = await db
        .update(withdrawals)
        .set({ status, adminNote: adminNote || null, updatedAt: new Date() })
        .where(and(eq(withdrawals.id, w.id), eq(withdrawals.status, 'pending')))
        .returning({ id: withdrawals.id });
      if (claimed.length === 0) {
        throw new NotFoundError('درخواست برداشت یافت نشد یا قبلاً بررسی شده');
      }
      if (status === 'rejected') {
        await db
          .update(users)
          .set({ earnings: sql`${users.earnings} + ${w.amount}`, updatedAt: new Date() })
          .where(eq(users.id, w.userId));
      }
      logger.info(`Admin resolved withdrawal ${w.id} -> ${status}`);
      return NextResponse.json({ success: true, message: 'وضعیت بروزرسانی شد' });
    }

    if (action === 'adjust_user') {
      const { userId, credits, isGolden, goldenDays, earnings } = body;
      const u = await db.query.users.findFirst({ where: eq(users.id, Number(userId)) });
      if (!u) throw new NotFoundError('کاربر یافت نشد');
      const patch: Record<string, any> = { updatedAt: new Date() };
      if (typeof credits === 'number') patch.credits = credits;
      if (typeof earnings === 'number') patch.earnings = earnings;
      if (typeof isGolden === 'boolean') {
        patch.isGolden = isGolden;
        if (isGolden && goldenDays) {
          patch.goldenExpiresAt = new Date(Date.now() + Number(goldenDays) * 86400000).toISOString();
        }
        if (!isGolden) patch.goldenExpiresAt = null;
      }
      await db.update(users).set(patch).where(eq(users.id, u.id));
      logger.info(`Admin adjusted user ${u.id}`, patch);
      return NextResponse.json({ success: true, message: 'کاربر بروزرسانی شد' });
    }

    if (action === 'create_garage' || action === 'update_garage') {
      const name = String(body.name || '').trim();
      const lat = Number(body.lat);
      const lng = Number(body.lng);
      if (!name) throw new BadRequestError('نام تعمیرگاه الزامی است');
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new BadRequestError('مختصات lat/lng الزامی است');
      }
      const specialties = Array.isArray(body.specialties)
        ? body.specialties.join(',')
        : String(body.specialties || '');
      const values: any = {
        name,
        address: body.address ? String(body.address) : null,
        phone: body.phone ? String(body.phone) : null,
        lat,
        lng,
        rating: body.rating != null && body.rating !== '' ? Number(body.rating) : null,
        reviewsCount:
          body.reviewsCount != null && body.reviewsCount !== '' ? Number(body.reviewsCount) : 0,
        specialties: specialties || null,
        photoUrl: body.photoUrl ? String(body.photoUrl) : null,
        website: body.website ? String(body.website) : null,
        description: body.description ? String(body.description) : null,
        isOpen: body.isOpen !== false && body.isOpen !== '0',
        isVerified: Boolean(body.isVerified === true || body.isVerified === '1'),
        isActive: body.isActive !== false && body.isActive !== '0',
        subscriptionTier: ['free', 'silver', 'gold'].includes(String(body.subscriptionTier || ''))
          ? String(body.subscriptionTier)
          : 'free',
        subscriptionExpiresAt: body.subscriptionExpiresAt
          ? String(body.subscriptionExpiresAt)
          : null,
        city: body.city ? String(body.city) : null,
        updatedAt: new Date(),
      };
      const tier = values.subscriptionTier as string;
      values.isFeatured =
        tier === 'gold'
          ? true
          : Boolean(body.isFeatured === true || body.isFeatured === '1');

      if (action === 'create_garage') {
        const inserted = await db.insert(garages).values(values).returning();
        logger.info(`Admin created garage ${inserted[0]?.id}`);
        return NextResponse.json({
          success: true,
          message: 'تعمیرگاه اضافه شد',
          data: { id: inserted[0]?.id },
        });
      }
      const id = Number(body.id);
      if (!id) throw new BadRequestError('شناسه تعمیرگاه الزامی است');
      const found = await db.select().from(garages).where(eq(garages.id, id)).limit(1);
      if (!found[0]) throw new NotFoundError('تعمیرگاه یافت نشد');
      await db.update(garages).set(values).where(eq(garages.id, id));
      logger.info(`Admin updated garage ${id}`);
      return NextResponse.json({ success: true, message: 'تعمیرگاه بروزرسانی شد' });
    }

    if (action === 'toggle_garage') {
      const id = Number(body.id);
      const field = String(body.field || '');
      if (!id) throw new BadRequestError('شناسه الزامی است');
      if (!['isFeatured', 'isVerified', 'isActive', 'isOpen'].includes(field)) {
        throw new BadRequestError('field نامعتبر');
      }
      const found = await db.select().from(garages).where(eq(garages.id, id)).limit(1);
      const existing = found[0];
      if (!existing) throw new NotFoundError('تعمیرگاه یافت نشد');
      const current = (existing as any)[field];
      const patch: Record<string, any> = { [field]: !current, updatedAt: new Date() };
      await db.update(garages).set(patch).where(eq(garages.id, id));
      logger.info(`Admin toggled garage ${id}.${field} -> ${!current}`);
      return NextResponse.json({ success: true, message: 'بروزرسانی شد', data: { [field]: !current } });
    }

    if (action === 'delete_garage') {
      const id = Number(body.id);
      if (!id) throw new BadRequestError('شناسه الزامی است');
      const found = await db.select().from(garages).where(eq(garages.id, id)).limit(1);
      if (!found[0]) throw new NotFoundError('تعمیرگاه یافت نشد');
      await db.update(garages).set({ isActive: false, updatedAt: new Date() }).where(eq(garages.id, id));
      logger.info(`Admin soft-deleted garage ${id}`);
      return NextResponse.json({ success: true, message: 'تعمیرگاه غیرفعال شد' });
    }

    throw new BadRequestError('action نامعتبر');
  } catch (error) {
    return handleError(error);
  }
}
