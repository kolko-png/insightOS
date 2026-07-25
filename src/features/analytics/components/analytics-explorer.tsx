'use client';

import { useState } from 'react';
import { useTrendQuery } from '../hooks/use-trend-query';
import { useCategoryBreakdownQuery } from '../hooks/use-category-breakdown-query';
import { TrendForecastChart } from './trend-forecast-chart';
import { CategoryBreakdownCharts } from './category-breakdown-charts';
import { ExportButton } from './export-button';
import { cn } from '@/lib/utils/cn';
import type { RevenueTrendPoint, CategoryBreakdown } from '@/lib/validation/analytics.schema';

const RANGE_OPTIONS = [
  { label: '3 months', value: 3 },
  { label: '6 months', value: 6 },
  { label: '12 months', value: 12 },
  { label: '24 months', value: 24 },
] as const;

export function AnalyticsExplorer({
  initialTrend,
  initialCategoryBreakdown,
}: {
  initialTrend: RevenueTrendPoint[];
  initialCategoryBreakdown: CategoryBreakdown;
}) {
  const [months, setMonths] = useState(12);
  const { data: trend = [] } = useTrendQuery(months, initialTrend);
  const { data: categoryBreakdown } = useCategoryBreakdownQuery(initialCategoryBreakdown);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-border/60 bg-card p-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setMonths(opt.value)}
              className={cn(
                'rounded-md px-3 py-1.5 text-[12.5px] transition-colors',
                months === opt.value
                  ? 'bg-accent font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <ExportButton trend={trend} />
      </div>

      <TrendForecastChart data={trend} />
      <CategoryBreakdownCharts data={categoryBreakdown} />
    </div>
  );
}
