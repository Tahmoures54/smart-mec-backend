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
  | 'credit_10'
  | 'credit_35'
  | 'credit_90'
  | 'gold_monthly'
  | 'gold_quarterly'
  | 'blue_tick'
  | 'garage_silver_30'
  | 'garage_gold_30';

export interface Product {
  id: ProductId;
  name: string;
  title: string;
  /** توضیح کوتاه برای کارت فروش */
  subtitle?: string;
  price: number;
  /** قیمت مرجع برای لنگر ذهنی (اختیاری) */
  compareAtPrice?: number;
  credits: number;
  goldenDays: number;
  monthlyLimit: number;
  days: number;
  dailyCap?: number;
  periodCap?: number;
  /** برچسب روان‌شناسی: محبوب / به‌صرفه / شروع */
  badge?: string;
  /** کارت برجسته در UI */
  highlight?: boolean;
  /** ترتیب نمایش */
  sortOrder?: number;
}

/**
 * قیمت‌ها به تومان.
 */
export const PRODUCTS: Record<ProductId, Product> = {
  credit_10: {
    id: 'credit_10',
    name: 'بسته شروع',
    title: '۱۰ عیب‌یابی',
    subtitle: 'قیمت پایه برای شروع',
    price: 19990,
    compareAtPrice: 19990,
    credits: 10,
    goldenDays: 0,
    monthlyLimit: 0,
    days: 0,
    sortOrder: 10,
  },
  credit_35: {
    id: 'credit_35',
    name: 'بسته کاربردی',
    title: '۳۵ عیب‌یابی',
    subtitle: 'تخفیف حجمی برای استفاده بیشتر',
    price: 59000,
    compareAtPrice: 69965,
    credits: 35,
    goldenDays: 0,
    monthlyLimit: 0,
    days: 0,
    badge: 'محبوب',
    highlight: true,
    sortOrder: 20,
  },
  credit_90: {
    id: 'credit_90',
    name: 'بسته پرمصرف',
    title: '۹۰ عیب‌یابی',
    subtitle: 'کمترین قیمت هر عیب‌یابی در بسته‌های اعتباری',
    price: 129000,
    compareAtPrice: 179910,
    credits: 90,
    goldenDays: 0,
    monthlyLimit: 0,
    days: 0,
    badge: 'به‌صرفه',
    highlight: true,
    sortOrder: 30,
  },
  gold_monthly: {
    id: 'gold_monthly',
    name: 'طلایی ماهانه',
    title: '۳۰ روز طلایی',
    subtitle: 'تا ۱۰ عیب‌یابی در روز، حداکثر ۱۵۰ عیب‌یابی در دوره',
    price: 149000,
    compareAtPrice: 149000,
    credits: 0,
    goldenDays: 30,
    monthlyLimit: 150,
    days: 30,
    dailyCap: 10,
    periodCap: 150,
    badge: 'پیشنهاد هوشمند',
    highlight: true,
    sortOrder: 40,
  },
  gold_quarterly: {
    id: 'gold_quarterly',
    name: 'طلایی سه‌ماهه',
    title: '۹۰ روز طلایی',
    subtitle: 'تا ۱۵ عیب‌یابی در روز، حداکثر ۵۰۰ عیب‌یابی در دوره',
    price: 399000,
    compareAtPrice: 447000,
    credits: 0,
    goldenDays: 90,
    monthlyLimit: 500,
    days: 90,
    dailyCap: 15,
    periodCap: 500,
    badge: 'صرفه‌جویی',
    sortOrder: 50,
  },
  blue_tick: {
    id: 'blue_tick',
    name: 'تیک آبی',
    title: 'تیک آبی',
    subtitle: 'نشان اعتماد در پروفایل',
    price: 49000,
    credits: 0,
    goldenDays: 0,
    monthlyLimit: 0,
    days: 0,
    sortOrder: 60,
  },
  garage_silver_30: {
    id: 'garage_silver_30',
    name: 'معرفی تعمیرگاه نقره‌ای',
    title: 'نمایش در چت — ۳۰ روز نقره‌ای',
    subtitle: 'دیده شدن کنار تشخیص کاربران',
    price: 299000,
    credits: 0,
    goldenDays: 0,
    monthlyLimit: 0,
    days: 30,
    sortOrder: 70,
  },
  garage_gold_30: {
    id: 'garage_gold_30',
    name: 'معرفی تعمیرگاه طلایی',
    title: 'نمایش ویژه در چت — ۳۰ روز',
    subtitle: 'اولویت نمایش + برجسته',
    price: 599000,
    credits: 0,
    goldenDays: 0,
    monthlyLimit: 0,
    days: 30,
    badge: 'ویژه تعمیرگاه',
    sortOrder: 80,
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
  responseMode?: 'questions' | 'diagnosis' | string;
  followUpRound?: 0 | 1 | 2 | 3 | 4 | 5 | number;
  missingInfo?: string[];
  followUpQuestions?: string[];
  questionOptions?: Array<{ question: string; options: string[] }>;
  urgency: 'green' | 'yellow' | 'red' | string;
  confidence?: 'high' | 'medium' | 'low' | string;
  safeToDrive?: boolean | null;
  evidence?: string[];
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
/** Runtime status written by verify route is `completed`. `paid` kept as legacy alias. */
export type PurchaseStatus =
  | 'pending'
  | 'completed'
  | 'paid'
  | 'failed'
  | 'canceled';

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
