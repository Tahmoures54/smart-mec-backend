// ═══════════════════════════════════════════════════════════
// src/types/index.ts
// ═══════════════════════════════════════════════════════════

// ─── User & Auth ───
export interface User {
  id: number;
  phone: string;
  name?: string | null;
  isAdmin: boolean;
  isGold: boolean;
  goldExpiresAt?: Date | null;
  referralCode?: string | null;
  referredBy?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JWTPayload {
  userId: number;
  phone: string;
  isAdmin: boolean;
  iat?: number;
  exp?: number;
}

// ─── Car ───
export interface Car {
  id: number;
  userId: number;
  brand: string;
  model: string;
  year?: number | null;
  engine?: string | null;
  plateNumber?: string | null;
  vin?: string | null;
  createdAt: Date;
}

// ─── Products ───
export const PRODUCTS = {
  gold_monthly: {
    id: 'gold_monthly',
    title: 'اشتراک طلایی ماهانه',
    price: 50000,
    days: 30,
  },
  gold_quarterly: {
    id: 'gold_quarterly',
    title: 'اشتراک طلایی سه‌ماهه',
    price: 135000,
    days: 90,
  },
  gold_yearly: {
    id: 'gold_yearly',
    title: 'اشتراک طلایی سالانه',
    price: 480000,
    days: 365,
  },
  blue_tick: {
    id: 'blue_tick',
    title: 'تیک آبی',
    price: 30000,
    days: 30,
  },
} as const;

export type ProductId = keyof typeof PRODUCTS;

export interface Product {
  id: ProductId;
  title: string;
  price: number;
  days: number;
}

// ─── Diagnose ───
export interface DiagnoseRequest {
  carId?: number;
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
export interface Purchase {
  id: number;
  userId: number;
  productId: ProductId;
  amount: number;
  status: 'pending' | 'paid' | 'failed' | 'canceled';
  trackId?: string | null;
  createdAt: Date;
  paidAt?: Date | null;
}

// ─── API Response ───
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
