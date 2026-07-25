import { Inbox, Package, Receipt } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import type { ActivityItem } from '@/lib/validation/analytics.schema';

const currency = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export function RecentActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No activity yet"
        description="Orders and invoices will show up here as they come in."
      />
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card">
      <div className="border-b border-border/60 px-5 py-4">
        <h3 className="text-[14px] font-medium">Recent activity</h3>
      </div>
      <ul className="divide-y divide-border/60">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-5 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent">
              {item.type === 'order' ? (
                <Package className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
              ) : (
                <Receipt className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{item.description}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(item.occurredAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
                {item.status ? ` · ${item.status}` : ''}
              </p>
            </div>
            {item.amount !== null && (
              <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">
                {currency(item.amount)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
