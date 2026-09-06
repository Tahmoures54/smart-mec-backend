// GET  /api/garages — لیست
// POST /api/garages — افزودن (توکن ادمین سیستم)

import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDbReady } from '@/db';
import { garages } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { handleError, BadRequestError, UnauthorizedError } from '@/lib/error-handler';

export async function GET(request: NextRequest) {
  try {
    await ensureDbReady();
    const { searchParams } = request.nextUrl;
    const city = (searchParams.get('city') || '').trim();
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 50), 1), 200);

    const rows = await db
      .select()
      .from(garages)
      .where(eq(garages.isActive, true))
      .orderBy(desc(garages.isFeatured), desc(garages.id))
      .limit(limit);

    const filtered = city ? rows.filter((g) => (g.city || '').includes(city)) : rows;

    const data = filtered.map((g) => ({
      id: String(g.id),
      name: g.name,
      address: g.address,
      phone: g.phone,
      lat: g.lat,
      lng: g.lng,
      rating: g.rating,
      userRatingsTotal: g.reviewsCount ?? 0,
      specialties: (g.specialties || '').split(',').map((s) => s.trim()).filter(Boolean),
      photoUrl: g.photoUrl,
      isOpen: g.isOpen,
      isFeatured: g.isFeatured,
      isVerified: g.isVerified,
      city: g.city,
    }));

    return NextResponse.json({ success: true, data, meta: { count: data.length } });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDbReady();

    const auth = request.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const systemToken = process.env.ADMIN_SYSTEM_TOKEN;
    if (!systemToken || token !== systemToken) {
      throw new UnauthorizedError('فقط ادمین مجاز به افزودن تعمیرگاه است');
    }

    const body = await request.json();
    const name = String(body.name || '').trim();
    const lat = Number(body.lat);
    const lng = Number(body.lng);

    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestError('name، lat و lng الزامی هستند');
    }

    const specialties = Array.isArray(body.specialties)
      ? body.specialties.join(',')
      : String(body.specialties || '');

    const inserted = await db
      .insert(garages)
      .values({
        name,
        address: body.address ? String(body.address) : null,
        phone: body.phone ? String(body.phone) : null,
        lat,
        lng,
        rating: body.rating != null ? Number(body.rating) : null,
        reviewsCount: body.reviewsCount != null ? Number(body.reviewsCount) : 0,
        specialties: specialties || null,
        photoUrl: body.photoUrl ? String(body.photoUrl) : null,
        website: body.website ? String(body.website) : null,
        description: body.description ? String(body.description) : null,
        isOpen: body.isOpen !== false,
        isFeatured: Boolean(body.isFeatured),
        isVerified: Boolean(body.isVerified),
        isActive: body.isActive !== false,
        city: body.city ? String(body.city) : null,
      })
      .returning();

    const g = inserted[0];
    return NextResponse.json(
      {
        success: true,
        data: {
          id: String(g.id),
          name: g.name,
          lat: g.lat,
          lng: g.lng,
          isFeatured: g.isFeatured,
          isVerified: g.isVerified,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}
