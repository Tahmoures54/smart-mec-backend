// GET /api/garages/nearby (و /api/v1/garages/nearby)
// Query: lat, lng, radius, limit, featured, openNow, q, specialties

import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDbReady } from '@/db';
import { garages } from '@/db/schema';
import { and, eq, gte, lte } from 'drizzle-orm';
import { handleError, BadRequestError } from '@/lib/error-handler';
import { logger } from '@/utils/logger';

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

function parseBool(v: string | null): boolean {
  if (!v) return false;
  return v === '1' || v.toLowerCase() === 'true' || v === 'yes';
}

export async function GET(request: NextRequest) {
  try {
    await ensureDbReady();

    const { searchParams } = request.nextUrl;
    const lat = Number(searchParams.get('lat'));
    const lng = Number(searchParams.get('lng'));
    const radius = Math.min(Math.max(Number(searchParams.get('radius') || 3000), 200), 50000);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 30), 1), 100);
    const featuredOnly = parseBool(searchParams.get('featured'));
    const openNow = parseBool(searchParams.get('openNow'));
    const q = (searchParams.get('q') || '').trim();
    const specialtiesRaw = (searchParams.get('specialties') || '').trim();

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestError('پارامترهای lat و lng الزامی هستند');
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new BadRequestError('مختصات نامعتبر است');
    }

    const deg = radius / 111000;
    const minLat = lat - deg;
    const maxLat = lat + deg;
    const cosLat = Math.max(Math.cos((lat * Math.PI) / 180), 0.2);
    const minLng = lng - deg / cosLat;
    const maxLng = lng + deg / cosLat;

    const conditions = [
      eq(garages.isActive, true),
      gte(garages.lat, minLat),
      lte(garages.lat, maxLat),
      gte(garages.lng, minLng),
      lte(garages.lng, maxLng),
    ];

    if (featuredOnly) conditions.push(eq(garages.isFeatured, true));
    if (openNow) conditions.push(eq(garages.isOpen, true));

    const rows = await db.select().from(garages).where(and(...conditions)).limit(500);

    let results = rows.map((g) => {
      const distanceMeters = haversineMeters(lat, lng, g.lat, g.lng);
      const specialties = (g.specialties || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      return {
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
        distanceMeters: Math.round(distanceMeters),
      };
    });

    results = results.filter((g) => g.distanceMeters <= radius);

    if (q) {
      const qq = q.toLowerCase();
      results = results.filter(
        (g) =>
          g.name.toLowerCase().includes(qq) ||
          (g.address || '').toLowerCase().includes(qq) ||
          g.specialties.some((s) => s.toLowerCase().includes(qq))
      );
    }

    if (specialtiesRaw) {
      const wanted = specialtiesRaw
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (wanted.length) {
        results = results.filter((g) =>
          wanted.some((w) => g.specialties.some((s) => s.toLowerCase().includes(w)))
        );
      }
    }

    results.sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      return a.distanceMeters - b.distanceMeters;
    });

    results = results.slice(0, limit);

    logger.info(`[garages/nearby] lat=${lat} lng=${lng} radius=${radius} → ${results.length}`);

    return NextResponse.json({
      success: true,
      data: results,
      meta: { lat, lng, radius, count: results.length },
    });
  } catch (error) {
    return handleError(error);
  }
}
