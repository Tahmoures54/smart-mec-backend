// ═══════════════════════════════════════════════════════════
// Types & Interfaces - Smart-MEC
// ═══════════════════════════════════════════════════════════

export interface User {
  id: number;
  phone: string;
  credits: number;
  isGolden: boolean;
  goldenExpiresAt?: string | null;
  monthlyLimit?: number | null;
  referralCode?: string | null;
  referredBy?: number | null;
  earnings?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface GoldenUsage {
  id: number;
  userId: number;
  yearMonth: string;
  count: number;
  updatedAt: string;
}

export interface MonthlyFreeUsage {
  id: number;
  userId: number;
  yearMonth: string;
  freeCount: number;
  updatedAt: string;
}

export interface Diagnostic {
  id: number;
  userId: number;
  carId: string;
  description: string;
  result: string;
  audioUrl?: string | null;
  createdAt: string;
}

export interface Purchase {
  id: number;
  userId: number;
  productId: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  authority: string;
  refId?: string | null;
  createdAt: string;
  updatedAt?: string;
}

/** خودرو — سال ساخت توسط کاربر وارد می‌شود، نه از لیست ثابت */
export interface Car {
  id: string | number;
  brand: string;
  model: string;
  /** سال در JSON ممکن است بازه نمونه باشد؛ برای عیب‌یابی از ورودی کاربر استفاده می‌شود */
  year?: number | string;
  engine: string;
  gearbox?: string;
  commonIssues?: string | string[];
}

export interface JWTPayload {
  userId: number;
  phone: string;
  isGolden?: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface SMSResponse {
  return: {
    status: number;
    message: string;
  };
  entries?: any;
}

export interface PaymentResponse {
  success: boolean;
  paymentUrl?: string;
  authority?: string;
  error?: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  refId?: string;
  amount?: number;
  error?: string;
}

export type ProductId =
  | 'credit_1'
  | 'credit_5'
  | 'credit_10'
  | 'golden_30'
  | 'golden_90'
  | 'golden_365';

export interface Product {
  id: ProductId;
  name: string;
  price: number;
  credits?: number;
  goldenDays?: number;
  monthlyLimit?: number;
  discount?: number;
  popular?: boolean;
}

export interface RateLimitInfo {
  ip: string;
  endpoint: string;
  count: number;
  resetAt: number;
}

export const PRODUCTS: Record<ProductId, Product> = {
  credit_1: { id: 'credit_1', name: '۱ اعتبار عیب‌یابی', price: 15000, credits: 1 },
  credit_5: { id: 'credit_5', name: '۵ اعتبار عیب‌یابی', price: 65000, credits: 5, discount: 13 },
  credit_10: {
    id: 'credit_10',
    name: '۱۰ اعتبار عیب‌یابی',
    price: 120000,
    credits: 10,
    discount: 20,
    popular: true,
  },
  golden_30: {
    id: 'golden_30',
    name: 'اشتراک طلایی ۳۰ روزه',
    price: 199000,
    goldenDays: 30,
    monthlyLimit: 200,
  },
  golden_90: {
    id: 'golden_90',
    name: 'اشتراک طلایی ۹۰ روزه',
    price: 499000,
    goldenDays: 90,
    discount: 16,
    popular: true,
    monthlyLimit: 600,
  },
  golden_365: {
    id: 'golden_365',
    name: 'اشتراک طلایی سالانه',
    price: 1499000,
    goldenDays: 365,
    discount: 25,
    monthlyLimit: 2400,
  },
};
