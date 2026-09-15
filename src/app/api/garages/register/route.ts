import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDbReady } from '@/db';
import { garages } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getUserFromRequest } from '@/lib/auth';
import { handleError, BadRequestError } from '@/lib/error-handler';
import { RateLimiter } from '@/lib/rate-limiter';
import { toPublicGarage } from '@/lib/garage-dto';
import { ensureGarageChatColumns } from '@/lib/ensure-garage-chat-columns';

/** ثبت تعمیرگاه توسط خود تعمیرکار — تا پرداخت+تأیید ادمین در چت نمی‌آید */
export async function POST(request: NextRequest) {
  try {
    await ensureDbReady();
    await ensureGarageChatColumns();
    const user = await getUserFromRequest(request);
    const ip = RateLimiter.getIP(request);
    RateLimiter.check(ip, 'garage_register', 8, 30 * 60 * 1000);

    const body = await request.json();
    const name = String(body.name || '').trim();
    const lat = Number(body.lat);
    const lng = Number(body.lng);

    if (!name || name.length < 2) {
      throw new BadRequestError('نام تعمیرگاه الزامی است');
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestError('مختصات (lat/lng) الزامی است');
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new BadRequestError('مختصات نامعتبر است');
    }

    const specialties = Array.isArray(body.specialties)
      ? body.specialties.map(String).join(',')
      : String(body.specialties || '');

    const inserted = await db
      .insert(garages)
      .values({
        name,
        address: body.address ? String(body.address).trim() : null,
        phone: body.phone ? String(body.phone).trim() : user.phone,
        lat,
        lng,
        specialties: specialties || null,
        photoUrl: body.photoUrl ? String(body.photoUrl) : null,
        website: body.website ? String(body.website) : null,
        description: body.description ? String(body.description).trim() : null,
        city: body.city ? String(body.city).trim() : null,
        isOpen: body.isOpen !== false,
        isFeatured: false,
        isVerified: false,
        isActive: true,
        subscriptionTier: 'free',
        ownerUserId: user.id,
        chatStatus: 'none',
        showInChat: false,
      })
      .returning();

    const g = inserted[0];
    const { distanceMeters, ...rest } = toPublicGarage(g);
    void distanceMeters;

    return NextResponse.json(
      {
        success: true,
        data: {
          ...rest,
          ownerUserId: g.ownerUserId,
          chatStatus: g.chatStatus,
          showInChat: g.showInChat,
          message:
            'تعمیرگاه ثبت شد. برای نمایش در چت عیب‌یابی، پکیج معرفی را بخرید؛ بعد از پرداخت ادمین تأیید می‌کند.',
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureDbReady();
    await ensureGarageChatColumns();
    const user = await getUserFromRequest(request);

    const rows = await db
      .select()
      .from(garages)
      .where(eq(garages.ownerUserId, user.id))
      .orderBy(desc(garages.id))
      .limit(50);

    const data = rows.map((g) => {
      const { distanceMeters, ...rest } = toPublicGarage(g);
      void distanceMeters;
      return {
        ...rest,
        ownerUserId: g.ownerUserId,
        chatStatus: g.chatStatus,
        showInChat: g.showInChat,
      };
    });

    return NextResponse.json({ success: true, data, meta: { count: data.length } });
  } catch (error) {
    return handleError(error);
  }
}
