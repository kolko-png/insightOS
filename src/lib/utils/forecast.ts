import type { RevenueTrendPoint } from '@/lib/validation/analytics.schema';

export type ForecastPoint = {
  month: string;
  revenue: number;
  isForecast: true;
  revenueLow: number;
  revenueHigh: number;
};

/**
 * A time-series projection is a calculation, not a language task —
 * LLMs are unreliable at precise numeric extrapolation and will
 * confidently produce plausible-looking wrong numbers. So "Predict
 * next month's sales" here means a least-squares linear fit over
 * the historical trend, projected forward, with a confidence band
 * from the residual standard deviation (~80% band at ±1.28σ) —
 * plain, auditable math with a defensible-in-a-boardroom
 * calculation behind it. The AI Copilot (Phase 6) can still explain
 * *why* a trend looks the way it does by querying the same
 * REVENUE/EXPENSES tables through NL->SQL, but the predicted number
 * itself always comes from here, not from a model guessing.
 *
 * Needs at least 3 historical points to fit a meaningful line —
 * returns an empty forecast rather than a wild extrapolation from
 * too little data.
 */
export function forecastRevenue(history: RevenueTrendPoint[], periodsAhead = 2): ForecastPoint[] {
  const n = history.length;
  if (n < 3) return [];

  const xs = history.map((_, i) => i);
  const ys = history.map((p) => p.revenue);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  const denominator = xs.reduce((sum, x) => sum + (x - meanX) ** 2, 0);
  if (denominator === 0) return [];

  // Non-null: `i` is bounded by `xs.length === ys.length === n` by
  // construction (both built via `.map` over the same `history`
  // array on lines 32-33), so every index here is always in range —
  // `noUncheckedIndexedAccess` can't see that invariant statically.
  const slope =
    xs.reduce((sum, x, i) => sum + (x - meanX) * (ys[i]! - meanY), 0) / denominator;
  const intercept = meanY - slope * meanX;

  const residuals = ys.map((y, i) => y - (slope * xs[i]! + intercept));
  const stdDev = Math.sqrt(residuals.reduce((sum, r) => sum + r ** 2, 0) / n);

  // Non-null: guarded by `n < 3` returning early above, so `n - 1`
  // is always a valid index into `history` here.
  const lastMonth = parseMonth(history[n - 1]!.month);

  return Array.from({ length: periodsAhead }, (_, i) => {
    const x = n + i;
    const predicted = Math.max(0, slope * x + intercept);
    const date = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + i + 1, 1);

    return {
      month: formatMonth(date),
      revenue: predicted,
      isForecast: true as const,
      revenueLow: Math.max(0, predicted - 1.28 * stdDev),
      revenueHigh: predicted + 1.28 * stdDev,
    };
  });
}

function parseMonth(m: string): Date {
  const [yearStr, monthStr] = m.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!yearStr || !monthStr || Number.isNaN(year) || Number.isNaN(month)) {
    throw new Error(`forecastRevenue: malformed month value "${m}", expected "YYYY-MM"`);
  }
  return new Date(year, month - 1, 1);
}

function formatMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}