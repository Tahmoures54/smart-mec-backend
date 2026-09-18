import { logger } from '@/utils/logger';

export const TOMAN_TO_RIAL = 10;
export const ZIBAL_SANDBOX_MERCHANT = 'zibal';
export const ZIBAL_SUCCESS_RESULT = 100;
export const ZIBAL_ALREADY_VERIFIED_RESULT = 201;

const DEFAULT_REQUEST_URL = 'https://gateway.zibal.ir/v1/request';
const DEFAULT_VERIFY_URL = 'https://gateway.zibal.ir/v1/verify';
const DEFAULT_START_URL = 'https://gateway.zibal.ir/start';
const DEFAULT_TIMEOUT_MS = 15000;

export type ZibalPaymentMode = 'live' | 'sandbox' | 'mock' | 'unset';

export class ZibalError extends Error {
  constructor(
    message: string,
    public readonly result?: number
  ) {
    super(message);
    this.name = 'ZibalError';
  }
}

/** پشتیبانی از هر دو نام متغیر برای سازگاری با پنل لیارا / .env قدیمی */
export function getZibalMerchant(): string {
  return (
    process.env.ZIBAL_MERCHANT?.trim() ||
    process.env.ZIBAL_MERCHANT_ID?.trim() ||
    ''
  );
}

export function isZibalConfigured(): boolean {
  return getZibalMerchant().length > 0;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/** در production فقط وقتی مرچنت ست شده باشد پرداخت واقعی؛ MOCK فقط در development */
export function allowMockPayments(): boolean {
  if (isZibalConfigured()) return false;
  return !isProduction();
}

export function getZibalPaymentMode(): ZibalPaymentMode {
  const merchant = getZibalMerchant();
  if (!merchant) {
    return isProduction() ? 'unset' : 'mock';
  }
  if (merchant.toLowerCase() === ZIBAL_SANDBOX_MERCHANT) return 'sandbox';
  return 'live';
}

function requestUrl(): string {
  return process.env.ZIBAL_REQUEST_URL?.trim() || DEFAULT_REQUEST_URL;
}

function verifyUrl(): string {
  return process.env.ZIBAL_VERIFY_URL?.trim() || DEFAULT_VERIFY_URL;
}

function startUrlBase(): string {
  return (process.env.ZIBAL_START_URL?.trim() || DEFAULT_START_URL).replace(/\/$/, '');
}

function timeoutMs(): number {
  const n = Number(process.env.ZIBAL_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TIMEOUT_MS;
}

export function tomanToRial(toman: number): number {
  return Math.round(toman * TOMAN_TO_RIAL);
}

export function amountsMatchTomanAndRial(toman: number, rial: number): boolean {
  return tomanToRial(toman) === Math.round(rial);
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

export function startPaymentUrl(trackId: string | number): string {
  return `${startUrlBase()}/${trackId}`;
}

export function isUserCanceledCallback(success: string | null, status: string | null): boolean {
  if (success === '0') return true;
  return status === '3';
}

export function isSuccessfulVerifyResult(result: number): boolean {
  return result === ZIBAL_SUCCESS_RESULT || result === ZIBAL_ALREADY_VERIFIED_RESULT;
}

export function verifyResultMessage(result: number): string {
  const map: Record<number, string> = {
    100: 'موفق',
    201: 'قبلاً تأیید شده',
    202: 'سفارش یافت نشد یا پرداخت نشده',
    203: 'trackId نامعتبر',
  };
  return map[result] || `کد ${result}`;
}

interface ZibalRequestApiResponse {
  result?: number;
  trackId?: number;
  message?: string;
}

interface ZibalVerifyApiResponse {
  result?: number;
  refNumber?: string;
  amount?: number;
  status?: number;
  message?: string;
  orderId?: string;
}

export interface ZibalRequestResult {
  trackId: string;
  message?: string;
}

export interface ZibalVerifyResult {
  result: number;
  refNumber: string;
  amountRial?: number;
  message?: string;
  orderId?: string;
}

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs());
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    let data: T;
    try {
      data = JSON.parse(text) as T;
    } catch {
      throw new ZibalError(`پاسخ نامعتبر از درگاه (HTTP ${res.status})`);
    }
    if (!res.ok) {
      const msg =
        (data as { message?: string })?.message ||
        `خطای HTTP ${res.status} از درگاه`;
      throw new ZibalError(msg, res.status);
    }
    return data;
  } catch (e) {
    if (e instanceof ZibalError) throw e;
    if (e instanceof Error && e.name === 'AbortError') {
      throw new ZibalError('مهلت ارتباط با درگاه به پایان رسید');
    }
    throw new ZibalError(e instanceof Error ? e.message : 'خطای ارتباط با درگاه');
  } finally {
    clearTimeout(timer);
  }
}

export async function requestZibalPayment(params: {
  amountToman: number;
  callbackUrl: string;
  orderId: string;
  mobile?: string;
  description?: string;
}): Promise<ZibalRequestResult> {
  const merchant = getZibalMerchant();
  if (!merchant) {
    throw new ZibalError('درگاه پرداخت پیکربندی نشده است');
  }

  const amountRial = tomanToRial(params.amountToman);
  const payload: Record<string, unknown> = {
    merchant,
    amount: amountRial,
    callbackUrl: params.callbackUrl,
    orderId: params.orderId,
  };
  if (params.mobile) payload.mobile = params.mobile;
  if (params.description) payload.description = params.description;

  logger.info('Zibal request', {
    orderId: params.orderId,
    amountToman: params.amountToman,
    amountRial,
    mode: getZibalPaymentMode(),
  });

  const data = await postJson<ZibalRequestApiResponse>(requestUrl(), payload);

  if (data.result !== 100 || data.trackId == null) {
    throw new ZibalError(
      data.message || `درخواست پرداخت ناموفق (کد ${data.result})`,
      data.result
    );
  }

  return {
    trackId: String(data.trackId),
    message: data.message,
  };
}

export async function verifyZibalPayment(trackId: string): Promise<ZibalVerifyResult> {
  const merchant = getZibalMerchant();
  if (!merchant) {
    throw new ZibalError('درگاه پرداخت پیکربندی نشده است');
  }

  const data = await postJson<ZibalVerifyApiResponse>(verifyUrl(), {
    merchant,
    trackId: Number(trackId) || trackId,
  });

  return {
    result: data.result ?? -1,
    refNumber: data.refNumber ? String(data.refNumber) : '',
    amountRial: data.amount,
    message: data.message,
    orderId: data.orderId,
  };
}
