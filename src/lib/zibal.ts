/**
 * Zibal IPG client — https://help.zibal.ir/ipg/
 *
 * Amounts in our catalog are stored in toman. Zibal only accepts rials.
 */

export const TOMAN_TO_RIAL = 10;
export const ZIBAL_SANDBOX_MERCHANT = 'zibal';

const DEFAULT_REQUEST_URL = 'https://gateway.zibal.ir/v1/request';
const DEFAULT_VERIFY_URL = 'https://gateway.zibal.ir/v1/verify';
const DEFAULT_START_URL = 'https://gateway.zibal.ir/start';
const DEFAULT_TIMEOUT_MS = 15000;

export const ZIBAL_SUCCESS_RESULT = 100;
export const ZIBAL_ALREADY_VERIFIED_RESULT = 201;

export type ZibalPaymentMode = 'live' | 'sandbox' | 'unset';

export interface ZibalRequestPayload {
  amountToman: number;
  callbackUrl: string;
  description: string;
  orderId: string;
  mobile?: string | null;
}

export interface ZibalRequestResult {
  result: number;
  trackId: string;
  message: string;
}

export interface ZibalVerifyResult {
  result: number;
  status?: number;
  amountRial?: number;
  refNumber: string;
  cardNumber?: string;
  orderId?: string;
  message: string;
}

export class ZibalError extends Error {
  constructor(
    message: string,
    public readonly result?: number
  ) {
    super(message);
    this.name = 'ZibalError';
  }
}

export function getZibalMerchant(): string {
  return (process.env.ZIBAL_MERCHANT || process.env.ZIBAL_MERCHANT_ID || '').trim();
}

export function getZibalPaymentMode(): ZibalPaymentMode {
  const merchant = getZibalMerchant();
  if (!merchant) return 'unset';
  if (merchant.toLowerCase() === ZIBAL_SANDBOX_MERCHANT) return 'sandbox';
  return 'live';
}

export function isZibalConfigured(): boolean {
  return getZibalPaymentMode() !== 'unset';
}

export function allowMockPayments(): boolean {
  return !isZibalConfigured() && process.env.NODE_ENV !== 'production';
}

export function tomanToRial(toman: number): number {
  if (!Number.isFinite(toman) || toman <= 0) {
    throw new ZibalError('مبلغ نامعتبر است');
  }
  return Math.round(toman * TOMAN_TO_RIAL);
}

export function amountsMatchTomanAndRial(toman: number, rial: number): boolean {
  if (!Number.isFinite(toman) || toman <= 0 || !Number.isFinite(rial) || rial <= 0) {
    return false;
  }
  return Math.round(toman * TOMAN_TO_RIAL) === rial;
}

export function getZibalTimeoutMs(): number {
  const n = parseInt(process.env.ZIBAL_TIMEOUT_MS || String(DEFAULT_TIMEOUT_MS), 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TIMEOUT_MS;
}

export function getZibalRequestUrl(): string {
  return (process.env.ZIBAL_REQUEST_URL || DEFAULT_REQUEST_URL).trim();
}

export function getZibalVerifyUrl(): string {
  return (process.env.ZIBAL_VERIFY_URL || DEFAULT_VERIFY_URL).trim();
}

export function getZibalStartBaseUrl(): string {
  return (process.env.ZIBAL_START_URL || DEFAULT_START_URL).trim().replace(/\/$/, '');
}

export function startPaymentUrl(trackId: string | number): string {
  return `${getZibalStartBaseUrl()}/${trackId}`;
}

export function purchaseOrderId(purchaseId: number): string {
  return `sm-${purchaseId}`;
}

export function parsePurchaseIdFromOrderId(orderId: string | null | undefined): number | null {
  if (!orderId) return null;
  const match = /^sm-(\d+)$/.exec(orderId.trim());
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function toZibalTrackId(trackId: string): number | string {
  if (/^\d+$/.test(trackId)) {
    const n = Number(trackId);
    if (Number.isSafeInteger(n)) return n;
  }
  return trackId;
}

export function isSuccessfulVerifyResult(result: number): boolean {
  return result === ZIBAL_SUCCESS_RESULT || result === ZIBAL_ALREADY_VERIFIED_RESULT;
}

export function isUserCanceledCallback(success: string | null, status: string | null): boolean {
  if (success === '0') return true;
  return status === '3';
}

export function requestResultMessage(result: number): string {
  switch (result) {
    case 100:
      return 'با موفقیت تایید شد.';
    case 102:
      return 'merchant یافت نشد.';
    case 103:
      return 'merchant غیرفعال است.';
    case 104:
      return 'merchant نامعتبر است.';
    case 105:
      return 'مبلغ باید بیشتر از ۱٬۰۰۰ ریال باشد.';
    case 106:
      return 'callbackUrl نامعتبر است. باید با http یا https شروع شود.';
    case 113:
      return 'مبلغ تراکنش از حد مجاز بالاتر است.';
    default:
      return 'خطا در اتصال به درگاه پرداخت.';
  }
}

export function verifyResultMessage(result: number): string {
  switch (result) {
    case 100:
      return 'با موفقیت تایید شد.';
    case 102:
      return 'merchant یافت نشد.';
    case 103:
      return 'merchant غیرفعال است.';
    case 104:
      return 'merchant نامعتبر است.';
    case 201:
      return 'قبلا تایید شده.';
    case 202:
      return 'سفارش پرداخت نشده یا ناموفق است.';
    case 203:
      return 'trackId نامعتبر است.';
    default:
      return 'پرداخت تأیید نشد.';
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getZibalTimeoutMs());
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = (await res.json()) as T;
    return data;
  } catch (error) {
    if (error instanceof ZibalError) throw error;
    throw new ZibalError('ارتباط با درگاه برقرار نشد.');
  } finally {
    clearTimeout(timeout);
  }
}

export async function requestZibalPayment(payload: ZibalRequestPayload): Promise<ZibalRequestResult> {
  const merchant = getZibalMerchant();
  if (!merchant) {
    throw new ZibalError('پیکربندی درگاه ناقص است (ZIBAL_MERCHANT).');
  }

  const body: Record<string, unknown> = {
    merchant,
    amount: tomanToRial(payload.amountToman),
    callbackUrl: payload.callbackUrl,
    description: payload.description,
    orderId: payload.orderId,
  };
  if (payload.mobile) body.mobile = payload.mobile;

  const data = await postJson<{
    result?: number;
    trackId?: number | string;
    message?: string;
  }>(getZibalRequestUrl(), body);

  const result = Number(data.result);
  if (result !== ZIBAL_SUCCESS_RESULT || data.trackId == null || data.trackId === '') {
    throw new ZibalError(data.message || requestResultMessage(result), result);
  }

  return {
    result,
    trackId: String(data.trackId),
    message: data.message || 'success',
  };
}

export async function verifyZibalPayment(trackId: string): Promise<ZibalVerifyResult> {
  const merchant = getZibalMerchant();
  if (!merchant) {
    throw new ZibalError('پیکربندی درگاه ناقص است (ZIBAL_MERCHANT).');
  }

  const data = await postJson<{
    result?: number;
    status?: number;
    amount?: number;
    refNumber?: string | number;
    cardNumber?: string;
    orderId?: string;
    message?: string;
  }>(getZibalVerifyUrl(), {
    merchant,
    trackId: toZibalTrackId(trackId),
  });

  return {
    result: Number(data.result),
    status: data.status == null ? undefined : Number(data.status),
    amountRial: data.amount == null ? undefined : Number(data.amount),
    refNumber: data.refNumber == null ? '' : String(data.refNumber),
    cardNumber: data.cardNumber,
    orderId: data.orderId,
    message: data.message || '',
  };
}

export function zibalTrustHref(siteName = 'smart-mec.ir'): string {
  return `https://gateway.zibal.ir/trustMe/${encodeURIComponent(siteName)}`;
}

export const ZIBAL_TRUST_IMG = 'https://zibal.ir/trust/assets/2.png';
