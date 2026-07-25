import { ArrowUpRight, ArrowDownRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { AnimatedCounter } from './animated-counter';

export function KpiCard({
  label,
  value,
  format,
  deltaPercent,
  icon: Icon,
}: {
  label: string;
  value: number;
  format?: (n: number) => string;
  deltaPercent?: number;
  icon: LucideIcon;
}) {
  const isPositive = (deltaPercent ?? 0) >= 0;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 transition-shadow hover:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
      </div>

      <div className="mt-3 text-[26px] font-semibold tracking-tight tabular-nums">
        <AnimatedCounter value={value} format={format} />
      </div>

      {deltaPercent !== undefined && (
        <div
          className={cn(
            'mt-2 flex items-center gap-1 text-xs font-medium',
            isPositive ? 'text-emerald-600' : 'text-red-600'
          )}
        >
          {isPositive ? (
            <ArrowUpRight className="h-3.5 w-3.5" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5" />
          )}
          {Math.abs(deltaPercent).toFixed(1)}% vs last month
        </div>
      )}
    </div>
  );
}
