'use client';

import { useQuery } from '@tanstack/react-query';
import type { KpiSummary } from '@/lib/validation/analytics.schema';


export function useKpiQuery(initialData: KpiSummary) {
  return useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: async (): Promise<KpiSummary> => {
      const res = await fetch('/api/analytics/kpis');
      if (!res.ok) throw new Error('Failed to refresh KPIs');
      return res.json();
    },
    initialData,
    refetchInterval: 60_000,
  });
}
