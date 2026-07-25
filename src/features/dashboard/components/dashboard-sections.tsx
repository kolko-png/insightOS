import { AlertTriangle } from 'lucide-react';
import {
  getDashboardKpis,
  getRevenueTrend,
  getRecentActivity,
  getInventoryAlerts,
} from '../server/queries';
import { KpiGridClient } from './kpi-grid';
import { RevenueChart } from './revenue-chart';
import { RecentActivityFeed } from './recent-activity-feed';

export async function KpiSection() {
  const kpis = await getDashboardKpis();
  return <KpiGridClient initialData={kpis} />;
}

export async function ChartSection() {
  const trend = await getRevenueTrend(6);
  return <RevenueChart data={trend} />;
}

export async function ActivitySection() {
  const activity = await getRecentActivity(8);
  return <RecentActivityFeed items={activity} />;
}

export async function InventoryAlertsSection() {
  const alerts = await getInventoryAlerts();
  if (alerts.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-500">
        <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />
        <span className="text-[13px] font-medium">
          {alerts.length} item{alerts.length > 1 ? 's' : ''} below reorder threshold
        </span>
      </div>
      <ul className="mt-2 space-y-1">
        {alerts.slice(0, 3).map((a) => (
          <li key={a.sku} className="text-xs text-muted-foreground">
            {a.productName} — {a.quantityOnHand} on hand (reorder at {a.reorderThreshold})
          </li>
        ))}
      </ul>
    </div>
  );
}
