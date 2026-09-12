import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDbReady } from '@/db';
import { garages } from '@/db/schema';
import { and, eq, gte, lte } from 'drizzle-orm';
import { handleError, BadRequestError } from '@/lib/error-handler';
import { logger } from '@/utils/logger';
import { boundingBox, haversineMeters } from '@/lib/geo';
import { compareGarages, toPublicGarage } from '@/lib/garage-dto';

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

    const box = boundingBox(lat, lng, radius);
    const conditions = [
      eq(garages.isActive, true),
      gte(garages.lat, box.minLat),
      lte(garages.lat, box.maxLat),
      gte(garages.lng, box.minLng),
      lte(garages.lng, box.maxLng),
    ];

    if (featuredOnly) conditions.push(eq(garages.isFeatured, true));
    if (openNow) conditions.push(eq(garages.isOpen, true));

    const rows = await db.select().from(garages).where(and(...conditions)).limit(500);

    let results = rows.map((g) =>
      toPublicGarage(g, {
        distanceMeters: Math.round(haversineMeters(lat, lng, g.lat, g.lng)),
      })
    );

    results = results.filter((g) => (g.distanceMeters ?? Infinity) <= radius);

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

    results.sort(compareGarages);
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
