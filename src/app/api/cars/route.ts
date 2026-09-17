import { NextRequest, NextResponse } from 'next/server';
import carsData from '@/data/cars.json';
import { Car } from '@/types';

const CATEGORY_LABELS: Record<string, string> = {
  sedan: 'سدان',
  suv: 'شاسی‌بلند',
  hatchback: 'هاچ‌بک',
  pickup: 'وانت',
  coupe: 'کوپه',
  wagon: 'استیشن',
  van: 'ون',
  minibus: 'مینی‌بوس',
  bus: 'اتوبوس',
  truck: 'کامیون',
  heavy: 'سنگین',
  tractor: 'تراکتور',
  motorcycle: 'موتورسیکلت',
  scooter: 'اسکوتر',
  atv: 'ATV',
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = (searchParams.get('q') || '').trim().toLowerCase();
  const brand = (searchParams.get('brand') || '').trim();
  const category = (searchParams.get('category') || '').trim().toLowerCase();
  const region = (searchParams.get('region') || '').trim();
  const popularOnly = searchParams.get('popular') === '1';
  const limitRaw = parseInt(searchParams.get('limit') || '80', 10);
  const offsetRaw = parseInt(searchParams.get('offset') || '0', 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 80;
  const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;

  let list = (carsData as Car[]).filter((c) => c.isActive !== false);

  if (brand) {
    list = list.filter((c) => c.brand.includes(brand));
  }
  if (category) {
    list = list.filter((c) => (c.category || '').toLowerCase() === category);
  }
  if (region) {
    list = list.filter((c) => (c.region || '').includes(region));
  }
  if (popularOnly) {
    list = list.filter((c) => c.isPopular);
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

  list = [...list].sort((a, b) => {
    const pop = Number(!!b.isPopular) - Number(!!a.isPopular);
    if (pop !== 0) return pop;
    const br = a.brand.localeCompare(b.brand, 'fa');
    if (br !== 0) return br;
    return a.model.localeCompare(b.model, 'fa');
  });

  const total = list.length;
  const page = list.slice(offset, offset + limit);

  const all = carsData as Car[];
  const brands = Array.from(new Set(all.map((c) => c.brand))).sort((a, b) =>
    a.localeCompare(b, 'fa')
  );
  const categoryCounts: Record<string, number> = {};
  for (const c of all) {
    const key = (c.category || 'other').toLowerCase();
    categoryCounts[key] = (categoryCounts[key] || 0) + 1;
  }
  const categories = Object.entries(categoryCounts)
    .map(([id, count]) => ({
      id,
      label: CATEGORY_LABELS[id] || id,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    success: true,
    data: page,
    meta: {
      count: page.length,
      total,
      offset,
      limit,
      hasMore: offset + page.length < total,
      brands,
      brandCount: brands.length,
      catalogTotal: all.length,
      categories,
    },
  });
}
