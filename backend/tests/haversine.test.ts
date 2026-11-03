import { haversineDistance, estimateEta, interpolate } from '../src/utils/haversine';

describe('Haversine Formula', () => {
  test('distance between same point is 0', () => {
    expect(haversineDistance(28.5921, 77.0460, 28.5921, 77.0460)).toBe(0);
  });

  test('calculates approximate distance between Delhi locations', () => {
    // Dwarka Sector 6 to Janakpuri District Centre (~5.5–6.5 km)
    const dist = haversineDistance(28.5921, 77.0460, 28.6282, 77.0862);
    expect(dist).toBeGreaterThan(4);
    expect(dist).toBeLessThan(8);
  });

  test('distance is symmetric', () => {
    const d1 = haversineDistance(28.5921, 77.0460, 28.6282, 77.0862);
    const d2 = haversineDistance(28.6282, 77.0862, 28.5921, 77.0460);
    expect(Math.abs(d1 - d2)).toBeLessThan(0.0001);
  });

  test('distance is always non-negative', () => {
    expect(haversineDistance(0, 0, 90, 180)).toBeGreaterThan(0);
  });
});

describe('ETA Estimation', () => {
  test('ETA for 40 km at 40 km/h is 60 minutes', () => {
    expect(estimateEta(40, 40)).toBe(60);
  });

  test('ETA for 0 km is 0', () => {
    expect(estimateEta(0, 40)).toBe(0);
  });

  test('ETA decreases with higher speed', () => {
    expect(estimateEta(10, 60)).toBeLessThan(estimateEta(10, 40));
  });
});

describe('Interpolate', () => {
  test('fraction 0 returns origin', () => {
    const p = interpolate(28.0, 77.0, 29.0, 78.0, 0);
    expect(p.lat).toBeCloseTo(28.0);
    expect(p.lng).toBeCloseTo(77.0);
  });

  test('fraction 1 returns destination', () => {
    const p = interpolate(28.0, 77.0, 29.0, 78.0, 1);
    expect(p.lat).toBeCloseTo(29.0);
    expect(p.lng).toBeCloseTo(78.0);
  });

  test('fraction 0.5 returns midpoint', () => {
    const p = interpolate(28.0, 77.0, 30.0, 79.0, 0.5);
    expect(p.lat).toBeCloseTo(29.0);
    expect(p.lng).toBeCloseTo(78.0);
  });
});
