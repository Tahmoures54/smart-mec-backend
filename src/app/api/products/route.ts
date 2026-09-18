import { NextResponse } from 'next/server';
import { PRODUCTS, type Product } from '@/types';

function enrich(product: Product) {
  const perCredit =
    product.credits > 0 ? Math.round(product.price / product.credits) : null;
  const perMonth =
    product.goldenDays > 0
      ? Math.round(product.price / (product.goldenDays / 30))
      : null;
  const hasDiscount =
    Boolean(product.compareAtPrice && product.compareAtPrice > product.price);
  const discountAmount = hasDiscount
    ? (product.compareAtPrice as number) - product.price
    : 0;
  const savePercent = hasDiscount
    ? Math.round((discountAmount / (product.compareAtPrice as number)) * 100)
    : null;

  return {
    ...product,
    currency: 'IRT',
    pricePerCredit: perCredit,
    pricePerMonth: perMonth,
    hasDiscount,
    originalPrice: hasDiscount ? product.compareAtPrice : product.price,
    discountAmount,
    savePercent,
  };
}

export async function GET() {
  const data = Object.values(PRODUCTS)
    .map(enrich)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return NextResponse.json({
    success: true,
    data,
    meta: {
      count: data.length,
      psychology: {
        entry: 'credit_5',
        popular: 'credit_20',
        bestValue: 'credit_50',
        smartSuggest: 'gold_monthly',
      },
    },
  });
}
