export const DEFAULT_ADMIN_PHONE = '09160684552';

export function normalizeIranMobile(phone: string): string {
  const cleaned = String(phone || '').replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+98')) return `0${cleaned.slice(3)}`;
  if (cleaned.startsWith('98') && cleaned.length >= 12) return `0${cleaned.slice(2)}`;
  if (/^9\d{9}$/.test(cleaned)) return `0${cleaned}`;
  return cleaned;
}

export function getAdminPhone(): string {
  return normalizeIranMobile(process.env.ADMIN_PHONE || DEFAULT_ADMIN_PHONE);
}

export function isAdminPhone(phone: string): boolean {
  return normalizeIranMobile(phone) === getAdminPhone();
}
