// ═══════════════════════════════════════════════════════════
// Public Products List - Smart-MEC
// ═══════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { PRODUCTS } from '@/types';

export async function GET() {
  const list = Object.values(PRODUCTS).map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    credits: p.credits ?? null,
    goldenDays: p.goldenDays ?? null,
    monthlyLimit: p.monthlyLimit ?? null,
    discount: p.discount ?? null,
    popular: p.popular ?? false,
  }));

  return NextResponse.json({
    success: true,
    data: list,
  });
}
