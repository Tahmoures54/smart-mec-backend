import { NextRequest, NextResponse } from 'next/server';
import carsData from '@/data/cars.json';
import { Car } from '@/types';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = (searchParams.get('q') || '').trim().toLowerCase();
  const brand = (searchParams.get('brand') || '').trim();
  const category = (searchParams.get('category') || '').trim();

  let list = carsData as Car[];
  if (brand) {
    list = list.filter((c) => c.brand.includes(brand));
  }
  if (category) {
    list = list.filter((c) => (c.category || '') === category);
  }
  if (q) {
    list = list.filter(
      (c) =>
        c.brand.toLowerCase().includes(q) ||
        c.model.toLowerCase().includes(q) ||
        String(c.id).toLowerCase().includes(q) ||
        (c.engine || '').toLowerCase().includes(q) ||
        (c.category || '').toLowerCase().includes(q)
    );
  }

  const all = carsData as Car[];
  const brands = Array.from(new Set(all.map((c) => c.brand)));
  const categories = Array.from(
    new Set(all.map((c) => c.category).filter((value): value is string => Boolean(value)))
  );

  return NextResponse.json({
    success: true,
    data: list,
    meta: { count: list.length, total: all.length, brands, categories },
  });
}
