import { describe, expect, it } from 'vitest';
import {
  validatePhone,
  validateOTP,
  validateYear,
  validateCarId,
  validateDescription,
  validateProductId,
  validateOptionalId,
  ValidationError,
} from '@/lib/validation';

describe('validatePhone', () => {
  it('normalizes +98 and 98 to 0-prefixed local numbers', () => {
    expect(validatePhone('+989123456789')).toBe('09123456789');
    expect(validatePhone('989123456789')).toBe('09123456789');
    expect(validatePhone('0912 345 6789')).toBe('09123456789');
  });

  it('rejects invalid numbers', () => {
    expect(() => validatePhone('123')).toThrow(ValidationError);
    expect(() => validatePhone('02188990000')).toThrow(ValidationError);
  });
});

describe('validateOTP', () => {
  it('accepts 4-6 digits', () => {
    expect(validateOTP('1234')).toBe('1234');
    expect(validateOTP('123456')).toBe('123456');
  });

  it('rejects non-numeric or wrong length', () => {
    expect(() => validateOTP('12')).toThrow(ValidationError);
    expect(() => validateOTP('abcdef')).toThrow(ValidationError);
  });
});

describe('validateYear', () => {
  it('accepts shamsi and gregorian ranges', () => {
    expect(validateYear(1402)).toBe('1402');
    expect(validateYear('2018')).toBe('2018');
  });

  it('rejects out of range years', () => {
    expect(() => validateYear(1200)).toThrow(ValidationError);
    expect(() => validateYear(1800)).toThrow(ValidationError);
  });
});

describe('validateCarId / description / products', () => {
  it('allows custom car ids', () => {
    expect(validateCarId('custom')).toBe('custom');
    expect(validateCarId('c12')).toBe('c12');
  });

  it('enforces description length', () => {
    expect(() => validateDescription('کوتاه')).toThrow(ValidationError);
    expect(validateDescription('صدای تق‌تق از جلوبندی می‌آید')).toContain('جلوبندی');
  });

  it('accepts catalog product ids only', () => {
    expect(validateProductId('credit_5')).toBe('credit_5');
    expect(() => validateProductId('free_gold')).toThrow(ValidationError);
  });

  it('parses optional ids', () => {
    expect(validateOptionalId(undefined, 'id')).toBeNull();
    expect(validateOptionalId('42', 'id')).toBe(42);
    expect(() => validateOptionalId('0', 'id')).toThrow(ValidationError);
  });
});
