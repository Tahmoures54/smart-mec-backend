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
export type CarCategory =
  | 'sedan'
  | 'suv'
  | 'hatchback'
  | 'pickup'
  | 'coupe'
  | 'wagon'
  | 'van'
  | 'minibus'
  | 'bus'
  | 'truck'
  | 'heavy'
  | 'tractor'
  | 'motorcycle'
  | 'scooter'
  | 'atv'
  | string;

export interface Car {
  id: string;
  brand: string;
  model: string;
  engine?: string;
  category?: CarCategory;
  fuelType?: string;
  isElectric?: boolean;
  isHybrid?: boolean;
  transmission?: string;
  region?: string;
  countryOfOrigin?: string;
  isPopular?: boolean;
  isActive?: boolean;
  commonIssues?: string[];
  dataQuality?: string;
  gearbox?: string;
  userId?: number;
  createdAt?: string | Date;
}

// ─── Products ───
export type ProductId =
  | 'credit_5'
  | 'credit_10'
  | 'credit_20'
  | 'credit_50'
  | 'credit_100'
  | 'gold_monthly'
  | 'gold_quarterly'
  | 'gold_yearly'
  | 'blue_tick'
  | 'garage_silver_30'
  | 'garage_gold_30';

export interface Product {
  id: ProductId;
  name: string;
  title: string;
  price: number;
  credits: number;
  goldenDays: number;
  monthlyLimit: number;
  days: number;
}

/** قیمت‌ها به تومان — هم‌تراز با اپ فلاتر */
export const PRODUCTS: Record<ProductId, Product> = {
  credit_5: {
    id: 'credit_5',
    name: 'پک ۵ اعتبار',
    title: 'پک ۵ اعتبار',
    price: 65000,
    credits: 5,
    goldenDays: 0,
    monthlyLimit: 0,
    days: 0,
  },
  credit_10: {
    id: 'credit_10',
    name: 'پک ۱۰ اعتبار',
    title: 'پک ۱۰ اعتبار',
    price: 120000,
    credits: 10,
    goldenDays: 0,
    monthlyLimit: 0,
    days: 0,
  },
  credit_20: {
    id: 'credit_20',
    name: 'پک ۲۰ اعتبار',
    title: 'پک ۲۰ اعتبار',
    price: 200000,
    credits: 20,
    goldenDays: 0,
    monthlyLimit: 0,
    days: 0,
  },
  credit_50: {
    id: 'credit_50',
    name: 'پک ۵۰ اعتبار',
    title: 'پک ۵۰ اعتبار',
    price: 350000,
    credits: 50,
    goldenDays: 0,
    monthlyLimit: 0,
    days: 0,
  },
  credit_100: {
    id: 'credit_100',
    name: 'پک ۱۰۰ اعتبار',
    title: 'پک ۱۰۰ اعتبار',
    price: 600000,
    credits: 100,
    goldenDays: 0,
    monthlyLimit: 0,
    days: 0,
  },
  gold_monthly: {
    id: 'gold_monthly',
    name: 'اشتراک طلایی ماهانه',
    title: 'اشتراک طلایی ماهانه',
    price: 199000,
    credits: 0,
    goldenDays: 30,
    monthlyLimit: 100,
    days: 30,
  },
  gold_quarterly: {
    id: 'gold_quarterly',
    name: 'اشتراک طلایی سه‌ماهه',
    title: 'اشتراک طلایی سه‌ماهه',
    price: 499000,
    credits: 0,
    goldenDays: 90,
    monthlyLimit: 100,
    days: 90,
  },
  gold_yearly: {
    id: 'gold_yearly',
    name: 'اشتراک طلایی سالانه',
    title: 'اشتراک طلایی سالانه',
    price: 1490000,
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
    days: 0,
  },
  garage_silver_30: {
    id: 'garage_silver_30',
    name: 'معرفی تعمیرگاه نقره‌ای (۳۰ روز)',
    title: 'معرفی در چت — نقره‌ای ۳۰ روز',
    price: 299000,
    credits: 0,
    goldenDays: 0,
    monthlyLimit: 0,
    days: 30,
  },
  garage_gold_30: {
    id: 'garage_gold_30',
    name: 'معرفی تعمیرگاه طلایی (۳۰ روز)',
    title: 'معرفی در چت — طلایی ۳۰ روز',
    price: 599000,
    credits: 0,
    goldenDays: 0,
    monthlyLimit: 0,
    days: 30,
  },
};

// ─── Diagnose ───
export interface DiagnoseRequest {
  carId?: string;
  year?: string | number;
  description: string;
  carName?: string;
  previousDiagnosticId?: number;
  audioUrl?: string;
}

export interface StructuredCause {
  title: string;
  probability: 'high' | 'medium' | 'low' | string;
  why?: string;
  costBand: 'low' | 'medium' | 'high' | string;
  costEstimate?: string | null;
  diyCheck?: string | null;
}

export interface StructuredDiagnose {
  urgency: 'green' | 'yellow' | 'red' | string;
  statusSummary: string;
  causes: StructuredCause[];
  mechanicQuestions: string[];
  warnings: string[];
  nextStep: string;
  footer?: string;
}

export interface DiagnoseResult {
  id?: number;
  diagnosticId?: number;
  userId?: number;
  carId?: string;
  description?: string;
  result: string;
  structured?: StructuredDiagnose | null;
  remainingCredits?: number | null;
  remainingFreeQuestions?: number | null;
  createdAt?: string | Date;
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
  garageId?: number | null;
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
