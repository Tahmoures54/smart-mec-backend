import { describe, expect, it } from 'vitest';
import { matchOrigin } from '@/lib/cors';

const allowed = [
  'https://smart-mec.ir',
  'https://smart-mec-backend-zeta.vercel.app',
];

describe('matchOrigin', () => {
  it('reflects an allowed origin', () => {
    expect(matchOrigin('https://smart-mec.ir', allowed)).toBe('https://smart-mec.ir');
  });

  it('falls back to the first allowlist entry when Origin is missing', () => {
    expect(matchOrigin(null, allowed)).toBe(allowed[0]);
  });

  it('rejects unknown origins', () => {
    expect(matchOrigin('https://evil.example', allowed, { allowLocalhost: false })).toBeNull();
  });

  it('allows localhost in development mode', () => {
    expect(
      matchOrigin('http://localhost:3000', allowed, { allowLocalhost: true })
    ).toBe('http://localhost:3000');
  });
});
