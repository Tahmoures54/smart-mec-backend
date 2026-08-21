// ═══════════════════════════════════════════════════════════
// Public Cars List - Smart-MEC
// ═══════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import carsData from '@/data/cars.json';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: carsData,
    count: Array.isArray(carsData) ? carsData.length : 0,
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
