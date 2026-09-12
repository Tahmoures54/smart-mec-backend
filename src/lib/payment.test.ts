import { describe, expect, it } from 'vitest';
import {
  computeGoldenExpiry,
  computeReferralCommission,
  isMockAuthority,
} from '@/lib/payment';
import { isGoldenActive } from '@/lib/user-status';
import { escapeHtml } from '@/lib/html';
import { garageTierRank, normalizeGarageTier } from '@/lib/constants';

describe('payment helpers', () => {
  it('detects mock authorities', () => {
    expect(isMockAuthority('MOCK_ABC')).toBe(true);
    expect(isMockAuthority('payping-code')).toBe(false);
  });

  it('extends golden from remaining expiry, otherwise from now', () => {
    const now = Date.parse('2026-01-01T00:00:00.000Z');
    const future = '2026-01-10T00:00:00.000Z';
    const extended = computeGoldenExpiry(future, 10, now);
    expect(extended.startsWith('2026-01-20')).toBe(true);

    const fromNow = computeGoldenExpiry('2025-01-01T00:00:00.000Z', 1, now);
    expect(fromNow.startsWith('2026-01-02')).toBe(true);
  });

  it('floors referral commission', () => {
    expect(computeReferralCommission(199000, 10)).toBe(19900);
    expect(computeReferralCommission(100, 0)).toBe(0);
    expect(computeReferralCommission(-1, 10)).toBe(0);
  });
});

describe('isGoldenActive', () => {
  it('requires a future expiry', () => {
    const now = new Date('2026-06-01T00:00:00.000Z');
    expect(
      isGoldenActive({ isGolden: true, goldenExpiresAt: '2026-07-01T00:00:00.000Z' }, now)
    ).toBe(true);
    expect(
      isGoldenActive({ isGolden: true, goldenExpiresAt: '2026-05-01T00:00:00.000Z' }, now)
    ).toBe(false);
    expect(isGoldenActive({ isGolden: false, goldenExpiresAt: '2099-01-01' }, now)).toBe(
      false
    );
  });
});

describe('escapeHtml', () => {
  it('escapes markup', () => {
    expect(escapeHtml('<script>"x"</script>')).toBe(
      '&lt;script&gt;&quot;x&quot;&lt;/script&gt;'
    );
  });
});

describe('garage tiers', () => {
  it('normalizes and ranks tiers', () => {
    expect(normalizeGarageTier('GOLD')).toBe('gold');
    expect(normalizeGarageTier('nope')).toBe('free');
    expect(garageTierRank('gold')).toBeGreaterThan(garageTierRank('silver'));
  });
});
