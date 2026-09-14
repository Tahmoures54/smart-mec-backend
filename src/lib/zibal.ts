export const ZIBAL_GATEWAY = 'https://gateway.zibal.ir';

export function getZibalMerchant(): string {
  return (process.env.ZIBAL_MERCHANT || '').trim();
}

export function isZibalConfigured(): boolean {
  return getZibalMerchant().length > 0;
}

/** قیمت محصولات تومان است؛ زیبال ریال می‌گیرد. */
export function tomanToRial(toman: number): number {
  if (!Number.isFinite(toman) || toman <= 0) return 0;
  return Math.round(toman * 10);
}

export function zibalStartUrl(trackId: string | number): string {
  return `${ZIBAL_GATEWAY}/start/${trackId}`;
}

export function parseZibalCallback(searchParams: URLSearchParams): {
  trackId: string | null;
  success: boolean;
  status: string | null;
  orderId: string | null;
} {
  const trackId =
    searchParams.get('trackId') ||
    searchParams.get('trackid') ||
    searchParams.get('code') ||
    searchParams.get('authority');
  const successRaw = (searchParams.get('success') || '').toLowerCase();
  return {
    trackId,
    success: successRaw === '1' || successRaw === 'true',
    status: searchParams.get('status'),
    orderId: searchParams.get('orderId'),
  };
}

/** ۱۰۰ موفق، ۲۰۱ قبلاً تأیید شده. */
export function isZibalVerifyPaid(result: number | undefined): boolean {
  return result === 100 || result === 201;
}

export type ZibalApiResponse = {
  result?: number;
  message?: string;
  trackId?: number;
  refNumber?: number | string;
  amount?: number;
  status?: number;
  paidAt?: string;
  cardNumber?: string;
  orderId?: string;
};

export async function zibalRequest(body: {
  amountRial: number;
  callbackUrl: string;
  description: string;
  orderId: string;
  mobile: string;
}): Promise<ZibalApiResponse> {
  const response = await fetch(`${ZIBAL_GATEWAY}/v1/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      merchant: getZibalMerchant(),
      amount: body.amountRial,
      callbackUrl: body.callbackUrl,
      description: body.description,
      orderId: body.orderId,
      mobile: body.mobile,
    }),
  });
  return (await response.json()) as ZibalApiResponse;
}

export async function zibalVerify(trackId: string | number): Promise<ZibalApiResponse> {
  const response = await fetch(`${ZIBAL_GATEWAY}/v1/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      merchant: getZibalMerchant(),
      trackId: Number(trackId) || trackId,
    }),
  });
  return (await response.json()) as ZibalApiResponse;
}
