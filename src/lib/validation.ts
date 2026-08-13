// ═══════════════════════════════════════════════════════════
// Validation Utilities - Smart-MEC
// ═══════════════════════════════════════════════════════════

import { ProductId, PRODUCTS } from '@/types';

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * اعتبارسنجی شماره موبایل ایران
 */
export function validatePhone(phone: string): string {
  if (!phone) {
    throw new ValidationError('شماره موبایل الزامی است', 'phone');
  }

  const cleaned = phone.replace(/[\s\-()]/g, '');
  const iranMobileRegex = /^(\+98|98|0)?9\d{9}$/;

  if (!iranMobileRegex.test(cleaned)) {
    throw new ValidationError(
      'شماره موبایل معتبر نیست. فرمت صحیح: 09123456789',
      'phone'
    );
  }

  let normalized = cleaned;
  if (normalized.startsWith('+98')) {
    normalized = '0' + normalized.slice(3);
  } else if (normalized.startsWith('98')) {
    normalized = '0' + normalized.slice(2);
  }

  return normalized;
}

/**
 * اعتبارسنجی کد OTP
 */
export function validateOTP(code: string): string {
  if (!code) {
    throw new ValidationError('کد تأیید الزامی است', 'code');
  }

  const cleaned = code.replace(/\s/g, '');

  if (!/^\d{4,6}$/.test(cleaned)) {
    throw new ValidationError('کد تأیید باید 4 تا 6 رقم باشد', 'code');
  }

  return cleaned;
}

/**
 * اعتبارسنجی توضیحات عیب‌یابی
 */
export function validateDescription(description: string): string {
  if (!description) {
    throw new ValidationError('توضیحات مشکل الزامی است', 'description');
  }

  const trimmed = description.trim();

  if (trimmed.length < 10) {
    throw new ValidationError(
      'توضیحات باید حداقل ۱۰ کاراکتر باشد',
      'description'
    );
  }

  if (trimmed.length > 2000) {
    throw new ValidationError(
      'توضیحات نباید بیشتر از ۲۰۰۰ کاراکتر باشد',
      'description'
    );
  }

  return trimmed;
}

/**
 * اعتبارسنجی شناسه خودرو
 */
export function validateCarId(carId: string): string {
  if (!carId) {
    throw new ValidationError('انتخاب خودرو الزامی است', 'carId');
  }

  const trimmed = carId.trim();

  // اجازه custom برای خودروهای خارج از لیست
  if (trimmed === 'custom') {
    return trimmed;
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    throw new ValidationError('شناسه خودرو نامعتبر است', 'carId');
  }

  return trimmed;
}

/**
 * اعتبارسنجی سال ساخت (شمسی یا میلادی)
 * شمسی: 1340–1410 | میلادی: 1960–2030
 */
export function validateYear(year: string | number | undefined | null): string {
  if (year === undefined || year === null || year === '') {
    throw new ValidationError('سال ساخت خودرو الزامی است', 'year');
  }

  const cleaned = String(year).trim().replace(/[^0-9]/g, '');
  const num = parseInt(cleaned, 10);

  if (!Number.isFinite(num)) {
    throw new ValidationError('سال ساخت نامعتبر است', 'year');
  }

  const isShamsi = num >= 1340 && num <= 1410;
  const isGregorian = num >= 1960 && num <= 2030;

  if (!isShamsi && !isGregorian) {
    throw new ValidationError(
      'سال ساخت باید بین ۱۳۴۰ تا ۱۴۱۰ (شمسی) یا ۱۹۶۰ تا ۲۰۳۰ (میلادی) باشد',
      'year'
    );
  }

  return String(num);
}

/**
 * اعتبارسنجی نام خودرو سفارشی
 */
export function validateCustomCarName(name: string | undefined | null): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    throw new ValidationError('نام خودرو باید حداقل ۲ کاراکتر باشد', 'carName');
  }
  if (trimmed.length > 100) {
    throw new ValidationError('نام خودرو بیش از حد طولانی است', 'carName');
  }
  return trimmed;
}

/**
 * اعتبارسنجی شناسه محصول
 */
export function validateProductId(productId: string): ProductId {
  if (!productId) {
    throw new ValidationError('انتخاب محصول الزامی است', 'productId');
  }

  if (!(productId in PRODUCTS)) {
    throw new ValidationError('محصول انتخاب‌شده معتبر نیست', 'productId');
  }

  return productId as ProductId;
}

/**
 * اعتبارسنجی Authority پرداخت
 */
export function validateAuthority(authority: string): string {
  if (!authority) {
    throw new ValidationError('کد رهگیری پرداخت الزامی است', 'authority');
  }

  const trimmed = authority.trim();

  if (trimmed.length < 6) {
    throw new ValidationError('کد رهگیری پرداخت نامعتبر است', 'authority');
  }

  return trimmed;
}

/**
 * اعتبارسنجی توکن JWT
 */
export function validateToken(token: string): string {
  if (!token) {
    throw new ValidationError('توکن احراز هویت الزامی است', 'token');
  }

  const trimmed = token.trim();

  if (!/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(trimmed)) {
    throw new ValidationError('فرمت توکن نامعتبر است', 'token');
  }

  return trimmed;
}

/**
 * Sanitize کردن ورودی‌های متنی برای جلوگیری از XSS
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * بررسی اینکه یک مقدار عدد صحیح مثبت است
 */
export function validatePositiveInteger(
  value: any,
  fieldName: string
): number {
  const num = Number(value);

  if (!Number.isInteger(num) || num <= 0) {
    throw new ValidationError(
      `${fieldName} باید یک عدد صحیح مثبت باشد`,
      fieldName
    );
  }

  return num;
}
