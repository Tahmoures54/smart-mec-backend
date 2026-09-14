import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  DEFAULT_ADMIN_PHONE,
  getAdminPhone,
  isAdminPhone,
  normalizeIranMobile,
} from '@/lib/admin-phone';

describe('admin phone', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults to the owner mobile number', () => {
    expect(getAdminPhone()).toBe(DEFAULT_ADMIN_PHONE);
    expect(isAdminPhone('09160684552')).toBe(true);
    expect(isAdminPhone('+989160684552')).toBe(true);
    expect(isAdminPhone('9160684552')).toBe(true);
    expect(isAdminPhone('09120000000')).toBe(false);
  });

  it('honors ADMIN_PHONE when set', () => {
    vi.stubEnv('ADMIN_PHONE', '0912 111 2233');
    expect(getAdminPhone()).toBe('09121112233');
    expect(isAdminPhone('09121112233')).toBe(true);
    expect(isAdminPhone(DEFAULT_ADMIN_PHONE)).toBe(false);
  });

  it('normalizes Iranian mobiles', () => {
    expect(normalizeIranMobile('+989160684552')).toBe('09160684552');
    expect(normalizeIranMobile('989160684552')).toBe('09160684552');
  });
});
