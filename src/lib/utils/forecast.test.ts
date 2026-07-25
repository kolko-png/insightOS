import { describe, it, expect } from 'vitest';
import { forecastRevenue } from './forecast';
import type { RevenueTrendPoint } from '@/lib/validation/analytics.schema';

function point(month: string, revenue: number): RevenueTrendPoint {
  return { month, revenue, expenses: 0 };
}

describe('forecastRevenue', () => {
  it('returns an empty forecast with fewer than 3 historical points', () => {
    expect(forecastRevenue([point('2026-01', 1000), point('2026-02', 1100)])).toEqual([]);
  });

  it('projects a clear upward trend upward', () => {
    const history = [
      point('2026-01', 1000),
      point('2026-02', 2000),
      point('2026-03', 3000),
      point('2026-04', 4000),
    ];
    const forecast = forecastRevenue(history, 2);
    expect(forecast).toHaveLength(2);
    expect(forecast[0]!.revenue).toBeGreaterThan(history[history.length - 1]!.revenue);
    expect(forecast[1]!.revenue).toBeGreaterThan(forecast[0]!.revenue);
  });

  it('projects a clear downward trend downward, floored at zero', () => {
    const history = [
      point('2026-01', 4000),
      point('2026-02', 3000),
      point('2026-03', 2000),
      point('2026-04', 1000),
    ];
    const forecast = forecastRevenue(history, 3);
    forecast.forEach((f) => expect(f.revenue).toBeGreaterThanOrEqual(0));
    expect(forecast[2]!.revenue).toBe(0);
  });

  it('continues month labels correctly across a year boundary', () => {
    const history = [point('2025-11', 1000), point('2025-12', 1100), point('2026-01', 1200)];
    const forecast = forecastRevenue(history, 2);
    expect(forecast[0]!.month).toBe('2026-02');
    expect(forecast[1]!.month).toBe('2026-03');
  });

  it('keeps revenueLow at or below revenueHigh for every point', () => {
    const history = [
      point('2026-01', 1000),
      point('2026-02', 1300),
      point('2026-03', 900),
      point('2026-04', 1500),
      point('2026-05', 1100),
    ];
    const forecast = forecastRevenue(history, 2);
    forecast.forEach((f) => expect(f.revenueLow).toBeLessThanOrEqual(f.revenueHigh));
  });

  it('produces a flat forecast for perfectly flat history', () => {
    const history = [point('2026-01', 1000), point('2026-02', 1000), point('2026-03', 1000)];
    const forecast = forecastRevenue(history, 1);
    expect(forecast[0]!.revenue).toBeCloseTo(1000, 5);
  });

  it('respects the requested number of periods ahead', () => {
    const history = [point('2026-01', 1000), point('2026-02', 1100), point('2026-03', 1200)];
    expect(forecastRevenue(history, 4)).toHaveLength(4);
  });
});