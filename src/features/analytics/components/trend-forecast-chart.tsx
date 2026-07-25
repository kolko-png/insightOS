'use client';

import { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { forecastRevenue } from '@/lib/utils/forecast';
import type { RevenueTrendPoint } from '@/lib/validation/analytics.schema';

const currency = (v: number) =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export function TrendForecastChart({ data }: { data: RevenueTrendPoint[] }) {
  const forecast = useMemo(() => forecastRevenue(data, 2), [data]);

  // Bridge the solid actual-revenue line into the dashed forecast
  // line by duplicating the last historical point onto the forecast
  // series — otherwise Recharts draws two disconnected lines with a
  // visible gap between "last actual" and "first forecast."
  const combined = useMemo(() => {
    const historical: Array<{
      month: string;
      actualRevenue: number;
      forecastRevenue?: number;
    }> = data.map((d) => ({ month: d.month, actualRevenue: d.revenue }));

    if (historical.length > 0 && forecast.length > 0) {
      const last = historical[historical.length - 1]!;
      last.forecastRevenue = last.actualRevenue;
    }

    const projected = forecast.map((f) => ({
      month: f.month,
      forecastRevenue: f.revenue,
      revenueLow: f.revenueLow,
      revenueHigh: f.revenueHigh,
    }));

    return [...historical, ...projected];
  }, [data, forecast]);

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="mb-4">
        <h3 className="text-[14px] font-medium">Revenue trend &amp; forecast</h3>
        <p className="text-xs text-muted-foreground">
          Dashed line projects the next {forecast.length || 2} months from a linear trend fit,
          shaded band is an approximate 80% confidence range
        </p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={combined} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="bandFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.12} />
              <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--color-border)" strokeOpacity={0.4} />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
            tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
          />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border)', fontSize: 12 }}
            formatter={(value: number) => currency(value)}
          />
          <Area type="monotone" dataKey="revenueHigh" stroke="none" fill="url(#bandFill)" connectNulls />
          <Area type="monotone" dataKey="revenueLow" stroke="none" fill="var(--color-card)" connectNulls />
          <Line
            type="monotone"
            dataKey="actualRevenue"
            stroke="var(--color-chart-1)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="forecastRevenue"
            stroke="var(--color-chart-1)"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
