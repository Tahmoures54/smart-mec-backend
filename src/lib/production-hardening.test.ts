import { describe, expect, it } from 'vitest';
import { amountsMatchTomanAndRial, parsePurchaseIdFromOrderId } from '@/lib/zibal';
import { validatePhone, validateOTP, validateDescription } from '@/lib/validation';
import { tryParseStructuredDiagnose } from '@/lib/diagnose-result';

describe('production hardening', () => {
  it('converts Toman to Rial exactly', () => {
    expect(amountsMatchTomanAndRial(125000, 1250000)).toBe(true);
    expect(amountsMatchTomanAndRial(125000, 1250001)).toBe(false);
  });

  it('binds payment order ids to a positive purchase id', () => {
    expect(parsePurchaseIdFromOrderId('sm-123')).toBe(123);
    expect(parsePurchaseIdFromOrderId('sm-0')).toBeNull();
    expect(parsePurchaseIdFromOrderId('other-123')).toBeNull();
  });

  it('validates OTP and phone input', () => {
    expect(validatePhone('+989121234567')).toBe('09121234567');
    expect(validateOTP(' 123456 ')).toBe('123456');
    expect(() => validateOTP('123')).toThrow();
  });

  it('rejects oversized diagnosis descriptions', () => {
    expect(() => validateDescription('x'.repeat(2001))).toThrow();
  });

  it('accepts and normalizes structured AI output', () => {
    const result = tryParseStructuredDiagnose(JSON.stringify({
      urgency: 'yellow',
      statusSummary: 'نیاز به بررسی دارد',
      causes: [{ title: 'شمع', probability: 'high', why: 'علائم سازگار است' }],
      mechanicQuestions: ['صدای موتور را بررسی کن'],
      warnings: ['با چراغ روغن رانندگی نکن'],
      nextStep: 'بازدید اولیه',
    }));
    expect(result?.causes).toHaveLength(1);
    expect(result?.urgency).toBe('yellow');
  });
});
