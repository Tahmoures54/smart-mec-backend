import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  TOMAN_TO_RIAL,
  allowMockPayments,
  amountsMatchTomanAndRial,
  getZibalMerchant,
  getZibalPaymentMode,
  isSuccessfulVerifyResult,
  isUserCanceledCallback,
  isZibalConfigured,
  parsePurchaseIdFromOrderId,
  purchaseOrderId,
  requestResultMessage,
  requestZibalPayment,
  startPaymentUrl,
  toZibalTrackId,
  tomanToRial,
  verifyResultMessage,
  verifyZibalPayment,
  zibalTrustHref,
} from './zibal';

describe('zibal helpers', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('reads ZIBAL_MERCHANT first, then ZIBAL_MERCHANT_ID', () => {
    expect(getZibalMerchant()).toBe('');
    expect(getZibalPaymentMode()).toBe('unset');
    expect(isZibalConfigured()).toBe(false);

    vi.stubEnv('ZIBAL_MERCHANT_ID', 'legacy-id');
    expect(getZibalMerchant()).toBe('legacy-id');
    expect(getZibalPaymentMode()).toBe('live');

    vi.stubEnv('ZIBAL_MERCHANT', 'zibal');
    expect(getZibalMerchant()).toBe('zibal');
    expect(getZibalPaymentMode()).toBe('sandbox');
  });

  it('never mocks payments in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(allowMockPayments()).toBe(false);

    vi.stubEnv('NODE_ENV', 'development');
    expect(allowMockPayments()).toBe(true);

    vi.stubEnv('ZIBAL_MERCHANT', 'zibal');
    expect(allowMockPayments()).toBe(false);
  });

  it('converts toman to rial and matches gateway amounts', () => {
    expect(TOMAN_TO_RIAL).toBe(10);
    expect(tomanToRial(199000)).toBe(1_990_000);
    expect(amountsMatchTomanAndRial(65000, 650000)).toBe(true);
    expect(amountsMatchTomanAndRial(65000, 65000)).toBe(false);
  });

  it('builds start URL and order ids', () => {
    expect(startPaymentUrl('15966442233311')).toBe(
      'https://gateway.zibal.ir/start/15966442233311'
    );
    expect(purchaseOrderId(42)).toBe('sm-42');
    expect(parsePurchaseIdFromOrderId('sm-42')).toBe(42);
    expect(parsePurchaseIdFromOrderId('other')).toBeNull();
  });

  it('keeps numeric trackIds as safe integers', () => {
    expect(toZibalTrackId('15966442233311')).toBe(15966442233311);
    expect(toZibalTrackId('abc')).toBe('abc');
  });

  it('classifies callback and verify results', () => {
    expect(isUserCanceledCallback('0', '1')).toBe(true);
    expect(isUserCanceledCallback('1', '3')).toBe(true);
    expect(isUserCanceledCallback('1', '2')).toBe(false);
    expect(isSuccessfulVerifyResult(100)).toBe(true);
    expect(isSuccessfulVerifyResult(201)).toBe(true);
    expect(isSuccessfulVerifyResult(202)).toBe(false);
    expect(requestResultMessage(106)).toContain('callbackUrl');
    expect(verifyResultMessage(202)).toContain('پرداخت نشده');
  });

  it('builds the public trust badge URL', () => {
    expect(zibalTrustHref()).toBe('https://gateway.zibal.ir/trustMe/smart-mec.ir');
  });

  it('requests and verifies payments against the Zibal API', async () => {
    vi.stubEnv('ZIBAL_MERCHANT', 'zibal');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({ result: 100, trackId: 15966442233311, message: 'success' }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          result: 100,
          amount: 1_990_000,
          refNumber: 12345,
          status: 1,
          message: 'success',
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const requested = await requestZibalPayment({
      amountToman: 199000,
      callbackUrl: 'https://smart-mec.ir/api/purchase/verify',
      description: 'اشتراک طلایی ماهانه',
      orderId: 'sm-1',
      mobile: '09120000000',
    });
    expect(requested.trackId).toBe('15966442233311');

    const requestBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string) as {
      merchant: string;
      amount: number;
      mobile: string;
      orderId: string;
    };
    expect(requestBody).toMatchObject({
      merchant: 'zibal',
      amount: 1_990_000,
      mobile: '09120000000',
      orderId: 'sm-1',
    });

    const verified = await verifyZibalPayment(requested.trackId);
    expect(verified.refNumber).toBe('12345');
    expect(amountsMatchTomanAndRial(199000, verified.amountRial || 0)).toBe(true);
    expect(isSuccessfulVerifyResult(verified.result)).toBe(true);
  });

  it('rejects a Zibal request when merchant is missing', async () => {
    await expect(
      requestZibalPayment({
        amountToman: 1000,
        callbackUrl: 'https://smart-mec.ir/api/purchase/verify',
        description: 'x',
        orderId: 'sm-1',
      })
    ).rejects.toThrow(/ZIBAL_MERCHANT/);
  });
});
