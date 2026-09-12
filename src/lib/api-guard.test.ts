import { describe, expect, it } from 'vitest';
import { isProtectedApiPath, normalizeApiPath } from '@/lib/api-guard';

describe('isProtectedApiPath', () => {
  it('keeps PayPing callback public even under /api/purchase', () => {
    expect(isProtectedApiPath('/api/purchase/verify')).toBe(false);
    expect(isProtectedApiPath('/api/v1/purchase/verify')).toBe(false);
    expect(isProtectedApiPath('/api/purchase/verify/')).toBe(false);
  });

  it('protects payment creation and diagnose routes', () => {
    expect(isProtectedApiPath('/api/purchase')).toBe(true);
    expect(isProtectedApiPath('/api/diagnose')).toBe(true);
    expect(isProtectedApiPath('/api/diagnose/audio')).toBe(true);
    expect(isProtectedApiPath('/api/feedback')).toBe(true);
    expect(isProtectedApiPath('/api/admin')).toBe(true);
  });

  it('leaves public catalog and health open', () => {
    expect(isProtectedApiPath('/api/products')).toBe(false);
    expect(isProtectedApiPath('/api/cars')).toBe(false);
    expect(isProtectedApiPath('/api/health')).toBe(false);
    expect(isProtectedApiPath('/api/garages/nearby')).toBe(false);
  });
});

describe('normalizeApiPath', () => {
  it('strips a trailing slash', () => {
    expect(normalizeApiPath('/api/purchase/verify/')).toBe('/api/purchase/verify');
  });
});
