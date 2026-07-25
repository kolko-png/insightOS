'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import type { CategoryBreakdown } from '@/lib/validation/analytics.schema';

const COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
];

const currency = (v: number) =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export function CategoryBreakdownCharts({ data }: { data: CategoryBreakdown }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-border/60 bg-card p-5">
        <h3 className="mb-4 text-[14px] font-medium">Revenue by source</h3>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data.revenueBySource}
              dataKey="amount"
              nameKey="label"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
            >
              {data.revenueBySource.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number) => currency(v)}
              contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border)', fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-5">
        <h3 className="mb-4 text-[14px] font-medium">Expenses by category</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data.expensesByCategory} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid horizontal={false} stroke="var(--color-border)" strokeOpacity={0.4} />
            <XAxis
              type="number"
              tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
              tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={100}
              tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(v: number) => currency(v)}
              contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border)', fontSize: 12 }}
            />
            <Bar dataKey="amount" fill="var(--color-chart-2)" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
