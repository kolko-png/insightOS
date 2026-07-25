'use client';

import { useQuery } from '@tanstack/react-query';
import type { CategoryBreakdown } from '@/lib/validation/analytics.schema';

export function useCategoryBreakdownQuery(initialData: CategoryBreakdown) {
  return useQuery({
    queryKey: ['analytics', 'category-breakdown'],
    queryFn: async (): Promise<CategoryBreakdown> => {
      const res = await fetch('/api/analytics/category-breakdown');
      if (!res.ok) throw new Error('Failed to load category breakdown');
      return res.json();
    },
    initialData,
    staleTime: 60_000,
  });
}
