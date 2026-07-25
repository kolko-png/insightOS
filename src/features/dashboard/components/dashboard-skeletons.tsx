function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className}`} />;
}

export function KpiGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border/60 bg-card p-5">
          <Pulse className="h-3 w-20" />
          <Pulse className="mt-3 h-7 w-28" />
          <Pulse className="mt-2 h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <Pulse className="h-3 w-32" />
      <Pulse className="mt-4 h-[280px] w-full" />
    </div>
  );
}

export function ActivitySkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <Pulse className="h-3 w-28" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Pulse key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
