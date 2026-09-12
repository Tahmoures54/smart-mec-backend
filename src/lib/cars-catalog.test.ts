import { describe, expect, it } from 'vitest';
import carsData from '@/data/cars.json';
import { Car } from '@/types';

const REQUIRED_CATEGORIES = [
  'سواری',
  'شاسی‌بلند',
  'وانت',
  'ون',
  'کامیون',
  'اتوبوس',
  'ماشین‌آلات سنگین',
  'موتورسیکلت',
  'اسکوتر',
];

describe('vehicle catalog', () => {
  const cars = carsData as Car[];

  it('has a large Iranian-market catalog with unique ids', () => {
    expect(cars.length).toBeGreaterThan(800);

    const ids = cars.map((c) => String(c.id));
    expect(new Set(ids).size).toBe(ids.length);

    for (const car of cars) {
      expect(car.brand.trim().length).toBeGreaterThan(1);
      expect(car.model.trim().length).toBeGreaterThan(0);
      expect(car.engine.trim().length).toBeGreaterThan(0);
      expect(car.category).toBeTruthy();
      const issues = Array.isArray(car.commonIssues)
        ? car.commonIssues
        : car.commonIssues
          ? [car.commonIssues]
          : [];
      expect(issues.length).toBeGreaterThan(0);
    }
  });

  it('covers passenger cars, motorcycles, trucks and heavy machinery', () => {
    const categories = new Set(cars.map((c) => c.category));
    for (const required of REQUIRED_CATEGORIES) {
      expect(categories.has(required), `missing category ${required}`).toBe(true);
    }

    expect(cars.some((c) => c.brand === 'ایران خودرو' && c.model.includes('پژو'))).toBe(true);
    expect(cars.some((c) => c.brand === 'سایپا')).toBe(true);
    expect(cars.some((c) => c.category === 'موتورسیکلت' && c.brand === 'هوندا')).toBe(true);
    expect(cars.some((c) => c.category === 'کامیون' && c.brand === 'ولوو')).toBe(true);
    expect(cars.some((c) => c.category === 'ماشین‌آلات سنگین' && c.model.includes('بیل'))).toBe(true);
  });

  it('keeps legacy ids c1-c243 for the flutter app', () => {
    for (let i = 1; i <= 243; i += 1) {
      expect(cars.some((c) => String(c.id) === `c${i}`)).toBe(true);
    }
  });
});
