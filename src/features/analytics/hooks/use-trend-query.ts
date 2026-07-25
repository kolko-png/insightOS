'use client';

import { useQuery } from '@tanstack/react-query';
import type { RevenueTrendPoint } from '@/lib/validation/analytics.schema';

const DEFAULT_MONTHS = 12;

export function useTrendQuery(months: number, initialData: RevenueTrendPoint[]) {
  return useQuery({
    queryKey: ['analytics', 'trend', months],
    queryFn: async (): Promise<RevenueTrendPoint[]> => {
      const res = await fetch(`/api/analytics/trend?months=${months}`);
      if (!res.ok) throw new Error('Failed to load trend');
      return res.json();
    },
    
    initialData: months === DEFAULT_MONTHS ? initialData : undefined,
    staleTime: 60_000,
  });
}
