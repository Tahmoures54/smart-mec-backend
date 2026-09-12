import { describe, expect, it } from 'vitest';
import { boundingBox, haversineMeters } from '@/lib/geo';

describe('haversineMeters', () => {
  it('returns ~0 for the same point', () => {
    expect(haversineMeters(35.7, 51.4, 35.7, 51.4)).toBeLessThan(1);
  });

  it('measures a known Tehran distance in a plausible range', () => {
    const meters = haversineMeters(35.6997, 51.338, 35.7575, 51.41);
    expect(meters).toBeGreaterThan(7000);
    expect(meters).toBeLessThan(12000);
  });
});

describe('boundingBox', () => {
  it('expands around the origin', () => {
    const box = boundingBox(35.7, 51.4, 3000);
    expect(box.minLat).toBeLessThan(35.7);
    expect(box.maxLat).toBeGreaterThan(35.7);
    expect(box.minLng).toBeLessThan(51.4);
    expect(box.maxLng).toBeGreaterThan(51.4);
  });
});
