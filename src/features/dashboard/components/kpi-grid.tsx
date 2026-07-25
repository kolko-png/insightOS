'use client';

import { DollarSign, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { useKpiQuery } from '../hooks/use-kpi-query';
import type { KpiSummary } from '@/lib/validation/analytics.schema';
import { KpiCard } from './kpi-card';

const currency = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export function KpiGridClient({ initialData }: { initialData: KpiSummary }) {
  const { data } = useKpiQuery(initialData);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard label="Revenue" value={data.revenue} format={currency} deltaPercent={data.growthPercent} icon={DollarSign} />
      <KpiCard label="Expenses" value={data.expenses} format={currency} icon={TrendingDown} />
      <KpiCard label="Profit" value={data.profit} format={currency} icon={TrendingUp} />
      <KpiCard label="Customers" value={data.customers} icon={Users} />
    </div>
  );
}
