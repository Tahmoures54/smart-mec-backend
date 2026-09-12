import { NextRequest, NextResponse } from 'next/server';
import carsData from '@/data/cars.json';
import { Car } from '@/types';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = (searchParams.get('q') || '').trim().toLowerCase();
  const brand = (searchParams.get('brand') || '').trim();

  let list = carsData as Car[];
  if (brand) {
    list = list.filter((c) => c.brand.includes(brand));
  }
  if (q) {
    list = list.filter(
      (c) =>
        c.brand.toLowerCase().includes(q) ||
        c.model.toLowerCase().includes(q) ||
        String(c.id).toLowerCase().includes(q) ||
        (c.engine || '').toLowerCase().includes(q)
    );
  }

  const brands = Array.from(new Set((carsData as Car[]).map((c) => c.brand)));

  return NextResponse.json({
    success: true,
    data: list,
    meta: { count: list.length, brands },
  });
}
