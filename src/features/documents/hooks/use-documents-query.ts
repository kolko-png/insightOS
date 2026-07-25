'use client';

import { useQuery } from '@tanstack/react-query';
import type { DocumentRecord } from '@/lib/validation/documents.schema';

export function useDocumentsQuery(initialData: DocumentRecord[]) {
  return useQuery({
    queryKey: ['documents'],
    queryFn: async (): Promise<DocumentRecord[]> => {
      const res = await fetch('/api/documents');
      if (!res.ok) throw new Error('Failed to load documents');
      return res.json();
    },
    initialData,
    // Only poll while something is actively processing — an idle
    // document list has no reason to hit the server every few
    // seconds. Mirrors the pattern from the dashboard's KPI polling.
    refetchInterval: (query) => {
      const docs = query.state.data ?? [];
      const stillProcessing = docs.some(
        (d) => d.status === 'processing' || d.status === 'uploading'
      );
      return stillProcessing ? 4000 : false;
    },
  });
}
