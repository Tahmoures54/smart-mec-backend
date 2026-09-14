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

// ─── Products ───
export type ProductId =
  | 'gold_monthly'
  | 'gold_quarterly'
  | 'gold_yearly'
  | 'blue_tick';

export interface Product {
  id: ProductId;
  name: string;
  title: string;        // alias برای سازگاری
  price: number;        // تومان
  goldenDays: number;   // مدت اشتراک طلایی
  monthlyLimit: number; // سقف درخواست ماهانه
  credits: number;      // اعتبار اضافه
  days: number;         // alias برای goldenDays
}

export const PRODUCTS: Record<ProductId, Product> = {
  gold_monthly: {
    id: 'gold_monthly',
    name: 'اشتراک طلایی ماهانه',
    title: 'اشتراک طلایی ماهانه',
    price: 50000,
    goldenDays: 30,
    monthlyLimit: 100,
    credits: 0,
    days: 30,
  },
  gold_quarterly: {
    id: 'gold_quarterly',
    name: 'اشتراک طلایی سه‌ماهه',
    title: 'اشتراک طلایی سه‌ماهه',
    price: 135000,
    goldenDays: 90,
    monthlyLimit: 100,
    credits: 0,
    days: 90,
  },
  gold_yearly: {
    id: 'gold_yearly',
    name: 'اشتراک طلایی سالانه',
    title: 'اشتراک طلایی سالانه',
    price: 480000,
    goldenDays: 365,
    monthlyLimit: 100,
    credits: 0,
    days: 365,
  },
  blue_tick: {
    id: 'blue_tick',
    name: 'تیک آبی',
    title: 'تیک آبی',
    price: 30000,
    goldenDays: 0,
    monthlyLimit: 0,
    credits: 0,
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
