// ═══════════════════════════════════════════════════════════
// src/types/index.ts
// ═══════════════════════════════════════════════════════════

// ─── User & Auth ───
export interface User {
  id: number;
  phone: string;
  credits: number;
  isGolden: boolean;
  goldenExpiresAt?: string | Date | null;
  monthlyLimit?: number | null;
  referralCode?: string | null;
  referredBy?: number | null;
  referralCount?: number;
  earnings?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface JWTPayload {
  userId: number;
  phone: string;
  isGolden: boolean;
  iat?: number;
  exp?: number;
}

// ─── Car ───
export interface Car {
  id: string;
  brand: string;
  model: string;
  engine?: string;
  gearbox?: string;
  commonIssues?: string[];
  userId?: number;
  createdAt?: string | Date;
}

// ─── Products (Credit Packs) ───
export type ProductId =
  | 'credit_5'
  | 'credit_10'
  | 'credit_20'
  | 'credit_50'
  | 'credit_100'
  | 'gold_monthly'
  | 'gold_quarterly'
  | 'gold_yearly'
  | 'blue_tick';

export interface Product {
  id: ProductId;
  name: string;
  title: string;
  price: number;         // تومان
  credits: number;       // تعداد اعتبار اضافه‌شده
  goldenDays: number;    // مدت طلایی (اگر 0 باشه، طلایی نمی‌شه)
  monthlyLimit: number;  // سقف ماهانه (0 = تغییر نده)
  days: number;          // alias برای goldenDays
}

export const PRODUCTS: Record<ProductId, Product> = {
  credit_5: {
    id: 'credit_5',
    name: 'پک ۵ اعتبار',
    title: 'پک ۵ اعتبار',
    price: 15000,
    credits: 5,
    goldenDays: 0,
    monthlyLimit: 0,
    days: 0,
  },
  credit_10: {
    id: 'credit_10',
    name: 'پک ۱۰ اعتبار',
    title: 'پک ۱۰ اعتبار',
    price: 28000,
    credits: 10,
    goldenDays: 0,
    monthlyLimit: 0,
    days: 0,
  },
  credit_20: {
    id: 'credit_20',
    name: 'پک ۲۰ اعتبار',
    title: 'پک ۲۰ اعتبار',
    price: 52000,
    credits: 20,
    goldenDays: 0,
    monthlyLimit: 0,
    days: 0,
  },
  credit_50: {
    id: 'credit_50',
    name: 'پک ۵۰ اعتبار',
    title: 'پک ۵۰ اعتبار',
    price: 120000,
    credits: 50,
    goldenDays: 0,
    monthlyLimit: 0,
    days: 0,
  },
  credit_100: {
    id: 'credit_100',
    name: 'پک ۱۰۰ اعتبار',
    title: 'پک ۱۰۰ اعتبار',
    price: 220000,
    credits: 100,
    goldenDays: 0,
    monthlyLimit: 0,
    days: 0,
  },
  gold_monthly: {
    id: 'gold_monthly',
    name: 'اشتراک طلایی ماهانه',
    title: 'اشتراک طلایی ماهانه',
    price: 99000,
    credits: 0,
    goldenDays: 30,
    monthlyLimit: 100,
    days: 30,
  },
  gold_quarterly: {
    id: 'gold_quarterly',
    name: 'اشتراک طلایی سه‌ماهه',
    title: 'اشتراک طلایی سه‌ماهه',
    price: 270000,
    credits: 0,
    goldenDays: 90,
    monthlyLimit: 100,
    days: 90,
  },
  gold_yearly: {
    id: 'gold_yearly',
    name: 'اشتراک طلایی سالانه',
    title: 'اشتراک طلایی سالانه',
    price: 990000,
    credits: 0,
    goldenDays: 365,
    monthlyLimit: 100,
    days: 365,
  },
  blue_tick: {
    id: 'blue_tick',
    name: 'تیک آبی',
    title: 'تیک آبی',
    price: 49000,
    credits: 0,
    goldenDays: 0,
    monthlyLimit: 0,
    days: 30,
  },
};

// ─── Diagnose ───
export interface DiagnoseRequest {
  carId?: string;
  description: string;
  audioUrl?: string;
}

export interface DiagnoseResult {
  id: number;
  userId: number;
  problem: string;
  solution: string;
  confidence: number;
  createdAt: Date;
}

// ─── Purchase ───
export type PurchaseStatus = 'pending' | 'paid' | 'failed' | 'canceled';

export interface Purchase {
  id: number;
  userId: number;
  productId: ProductId;
  amount: number;
  status: PurchaseStatus;
  authority?: string | null;
  trackId?: string | null;
  refId?: string | null;
  createdAt?: Date;
  paidAt?: Date | null;
}

// ─── API Response ───
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
