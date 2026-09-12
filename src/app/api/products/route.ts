import { NextResponse } from 'next/server';
import { PRODUCTS } from '@/types';

export async function GET() {
  const data = Object.values(PRODUCTS).map((product) => ({
    ...product,
    currency: 'IRT',
  }));

  return NextResponse.json({
    success: true,
    data,
    meta: { count: data.length },
  });
}
