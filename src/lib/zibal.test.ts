import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isZibalConfigured,
  isZibalVerifyPaid,
  parseZibalCallback,
  tomanToRial,
  zibalStartUrl,
} from '@/lib/zibal';

describe('zibal helpers', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('converts toman prices to rials', () => {
    expect(tomanToRial(15000)).toBe(150000);
    expect(tomanToRial(0)).toBe(0);
    expect(tomanToRial(-10)).toBe(0);
  });

  it('builds the start URL and parses the callback', () => {
    expect(zibalStartUrl(7731207)).toBe('https://gateway.zibal.ir/start/7731207');
    const parsed = parseZibalCallback(
      new URLSearchParams('success=1&trackId=99&status=2&orderId=SM-1&productId=credit_1')
    );
    expect(parsed).toMatchObject({
      trackId: '99',
      success: true,
      status: '2',
      orderId: 'SM-1',
    });
  });

  it('treats 100 and 201 as paid verify results', () => {
    expect(isZibalVerifyPaid(100)).toBe(true);
    expect(isZibalVerifyPaid(201)).toBe(true);
    expect(isZibalVerifyPaid(102)).toBe(false);
  });

  it('is configured only when a merchant is set', () => {
    expect(isZibalConfigured()).toBe(false);
    vi.stubEnv('ZIBAL_MERCHANT', 'zibal');
    expect(isZibalConfigured()).toBe(true);
  });
});
