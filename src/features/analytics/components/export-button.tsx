'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadCsv } from '@/lib/utils/export-csv';
import type { RevenueTrendPoint } from '@/lib/validation/analytics.schema';

export function ExportButton({ trend }: { trend: RevenueTrendPoint[] }) {
  const handleExport = () => {
    downloadCsv(`insightos-analytics-${new Date().toISOString().slice(0, 10)}.csv`, trend);
  };

  return (
    <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport} disabled={trend.length === 0}>
      <Download className="h-3.5 w-3.5" />
      Export CSV
    </Button>
  );
}
