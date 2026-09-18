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
  /** توضیح کوتاه برای کارت فروش */
  subtitle?: string;
  price: number;
  /** قیمت مرجع برای لنگر ذهنی (اختیاری) */
  compareAtPrice?: number;
  credits: number;
  goldenDays: number;
  monthlyLimit: number;
  days: number;
  /** برچسب روان‌شناسی: محبوب / به‌صرفه / شروع */
  badge?: string;
  /** کارت برجسته در UI */
  highlight?: boolean;
  /** ترتیب نمایش */
  sortOrder?: number;
}

/**
 * قیمت‌ها به تومان.
 *
 * منطق روان‌شناسی:
 * - ورود ارزان (credit_5): کاهش اصطکاک اولین خرید
 * - محبوب (credit_20): نقطهٔ طلایی — نه خیلی کم، نه خیلی گران
 * - به‌صرفه (credit_50): بیشترین صرفه‌جویی واحد → لنگر برای پرمصرف‌ها
 * - طلایی ماهانه: ارزان‌تر از چند بستهٔ متوسط اعتبار برای کاربر پرتکرار
 * - سه‌ماهه/سالانه: تخفیف آشکار نسبت به ماهانه (تعهد بلندمدت)
 */
export const PRODUCTS: Record<ProductId, Product> = {
  credit_5: {
    id: 'credit_5',
    name: 'شروع سریع',
    title: '۵ عیب‌یابی',
    subtitle: 'برای یک مشکل فوری — بدون تعهد',
    price: 49000,
    compareAtPrice: 65000,
    credits: 5,
    goldenDays: 0,
    monthlyLimit: 0,
    days: 0,
    badge: 'شروع آسان',
    sortOrder: 10,
  },
  credit_10: {
    id: 'credit_10',
    name: 'بسته کاربردی',
    title: '۱۰ عیب‌یابی',
    subtitle: 'چند مشکل یا پیگیری همان خودرو',
    price: 89000,
    compareAtPrice: 120000,
    credits: 10,
    goldenDays: 0,
    monthlyLimit: 0,
    days: 0,
    sortOrder: 20,
  },
  credit_20: {
    id: 'credit_20',
    name: 'انتخاب اکثر راننده‌ها',
    title: '۲۰ عیب‌یابی',
    subtitle: 'تعادل قیمت و تعداد — مناسب اکثر افراد',
    price: 149000,
    compareAtPrice: 200000,
    credits: 20,
    goldenDays: 0,
    monthlyLimit: 0,
    days: 0,
    badge: 'محبوب‌ترین',
    highlight: true,
    sortOrder: 30,
  },
  credit_50: {
    id: 'credit_50',
    name: 'به‌صرفه‌ترین واحد',
    title: '۵۰ عیب‌یابی',
    subtitle: 'کمترین قیمت هر عیب‌یابی — خانواده / چند خودرو',
    price: 299000,
    compareAtPrice: 400000,
    credits: 50,
    goldenDays: 0,
    monthlyLimit: 0,
    days: 0,
    badge: 'بهترین ارزش',
    highlight: true,
    sortOrder: 40,
  },
  credit_100: {
    id: 'credit_100',
    name: 'ویژه پرمصرف',
    title: '۱۰۰ عیب‌یابی',
    subtitle: 'برای کسانی که مدام سوال دارند',
    price: 499000,
    compareAtPrice: 700000,
    credits: 100,
    goldenDays: 0,
    monthlyLimit: 0,
    days: 0,
    sortOrder: 50,
  },
  gold_monthly: {
    id: 'gold_monthly',
    name: 'طلایی ماهانه',
    title: '۳۰ روز دسترسی طلایی',
    subtitle: 'تا ۱۰۰ عیب‌یابی در ماه — سوال قطع نمی‌شود',
    price: 179000,
    compareAtPrice: 199000,
    credits: 0,
    goldenDays: 30,
    monthlyLimit: 100,
    days: 30,
    badge: 'پیشنهاد هوشمند',
    highlight: true,
    sortOrder: 60,
  },
  gold_quarterly: {
    id: 'gold_quarterly',
    name: 'طلایی سه‌ماهه',
    title: '۹۰ روز طلایی',
    subtitle: 'حدود ۲۵٪ ارزان‌تر از سه ماه جداگانه',
    price: 449000,
    compareAtPrice: 537000,
    credits: 0,
    goldenDays: 90,
    monthlyLimit: 100,
    days: 90,
    badge: 'صرفه‌جویی',
    sortOrder: 70,
  },
  gold_yearly: {
    id: 'gold_yearly',
    name: 'طلایی سالانه',
    title: '۳۶۵ روز طلایی',
    subtitle: 'کمترین هزینه ماهانه — برای همراه همیشگی',
    price: 1290000,
    compareAtPrice: 2148000,
    credits: 0,
    goldenDays: 365,
    monthlyLimit: 100,
    days: 365,
    badge: 'حداکثر تخفیف',
    sortOrder: 80,
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
    sortOrder: 90,
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
    sortOrder: 100,
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
    sortOrder: 110,
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
  followUpRound?: 0 | 1 | 2 | number;
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
