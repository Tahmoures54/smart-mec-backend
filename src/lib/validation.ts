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

  // حذف فاصله‌ها و کاراکترهای اضافی
  const cleaned = phone.replace(/[\s\-()]/g, '');

  // فرمت‌های قبول‌شده:
  // 09123456789
  // 989123456789
  // +989123456789
  const iranMobileRegex = /^(\+98|98|0)?9\d{9}$/;

  if (!iranMobileRegex.test(cleaned)) {
    throw new ValidationError(
      'شماره موبایل معتبر نیست. فرمت صحیح: 09123456789',
      'phone'
    );
  }

  // نرمال‌سازی به فرمت 09xxxxxxxxx
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

  // کد OTP باید دقیقاً 4 یا 5 رقم باشد
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

  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    throw new ValidationError('شناسه خودرو نامعتبر است', 'carId');
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

  if (trimmed.length < 10) {
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

  // JWT همیشه سه قسمت دارد که با نقطه جدا شده‌اند
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