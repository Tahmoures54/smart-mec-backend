// GET /api/garages/:id (و /api/v1/garages/:id)

import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDbReady } from '@/db';
import { garages } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { handleError, BadRequestError, NotFoundError } from '@/lib/error-handler';

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbReady();

    const { id: idParam } = await context.params;
    const id = Number(idParam);
    if (!Number.isFinite(id) || id <= 0) {
      throw new BadRequestError('شناسه تعمیرگاه نامعتبر است');
    }

    const rows = await db.select().from(garages).where(eq(garages.id, id)).limit(1);
    const g = rows[0];
    if (!g || !g.isActive) {
      throw new NotFoundError('تعمیرگاه یافت نشد');
    }

    const { searchParams } = request.nextUrl;
    const userLat = Number(searchParams.get('lat'));
    const userLng = Number(searchParams.get('lng'));
    let distanceMeters: number | null = null;
    if (Number.isFinite(userLat) && Number.isFinite(userLng)) {
      distanceMeters = Math.round(haversineMeters(userLat, userLng, g.lat, g.lng));
    }

    const specialties = (g.specialties || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      data: {
        id: String(g.id),
        name: g.name,
        address: g.address,
        phone: g.phone,
        lat: g.lat,
        lng: g.lng,
        rating: g.rating,
        userRatingsTotal: g.reviewsCount ?? 0,
        reviewsCount: g.reviewsCount ?? 0,
        specialties,
        photoUrl: g.photoUrl,
        website: g.website,
        description: g.description,
        isOpen: g.isOpen,
        isFeatured: g.isFeatured,
        isVerified: g.isVerified,
        city: g.city,
        distanceMeters,
        openingHours: [],
        photos: g.photoUrl ? [g.photoUrl] : [],
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
