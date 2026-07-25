import { Suspense } from 'react';
import {
  KpiSection,
  ChartSection,
  ActivitySection,
  InventoryAlertsSection,
} from '@/features/dashboard/components/dashboard-sections';
import {
  KpiGridSkeleton,
  ChartSkeleton,
  ActivitySkeleton,
} from '@/features/dashboard/components/dashboard-skeletons';


export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="text-[20px] font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your business, at a glance.</p>
      </div>

      <Suspense fallback={null}>
        <InventoryAlertsSection />
      </Suspense>

      <Suspense fallback={<KpiGridSkeleton />}>
        <KpiSection />
      </Suspense>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<ChartSkeleton />}>
            <ChartSection />
          </Suspense>
        </div>
        <div>
          <Suspense fallback={<ActivitySkeleton />}>
            <ActivitySection />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
