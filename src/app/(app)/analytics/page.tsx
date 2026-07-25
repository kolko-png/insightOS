import { getTrend, getCategoryBreakdown } from '@/features/analytics/server/queries';
import { AnalyticsExplorer } from '@/features/analytics/components/analytics-explorer';

export default async function AnalyticsPage() {
  const [trend, categoryBreakdown] = await Promise.all([getTrend(12), getCategoryBreakdown()]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="text-[20px] font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Trends, forecasts, and category breakdowns across your business.
        </p>
      </div>

      <AnalyticsExplorer initialTrend={trend} initialCategoryBreakdown={categoryBreakdown} />
    </div>
  );
}
