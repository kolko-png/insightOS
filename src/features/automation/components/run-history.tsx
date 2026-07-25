'use client';

import { useState } from 'react';
import { Play, ChevronRight, CheckCircle2, XCircle, Loader2, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import {
  useWorkflowRunsQuery,
  useRunLogsQuery,
  useRunWorkflowNow,
} from '../hooks/use-automation';
import type { WorkflowRun } from '@/lib/validation/automation.schema';

const STATUS_STYLE: Record<WorkflowRun['status'], string> = {
  pending: 'text-muted-foreground',
  running: 'text-amber-600',
  success: 'text-emerald-600',
  failed: 'text-red-600',
};

export function RunHistory({ workflowId, initialRuns }: { workflowId: string; initialRuns: WorkflowRun[] }) {
  const { data: runs = [] } = useWorkflowRunsQuery(workflowId, initialRuns);
  const runNow = useRunWorkflowNow();
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-medium">Run history</h2>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => runNow.mutate(workflowId)}
          disabled={runNow.isPending}
        >
          <Play className="h-3.5 w-3.5" />
          {runNow.isPending ? 'Running…' : 'Run now'}
        </Button>
      </div>

      {runs.length === 0 ? (
        <EmptyState icon={History} title="No runs yet" description="Trigger this workflow or wait for it to fire naturally." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/60">
          {runs.map((run) => (
            <RunRow
              key={run.id}
              run={run}
              expanded={expandedRunId === run.id}
              onToggle={() => setExpandedRunId((id) => (id === run.id ? null : run.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RunRow({
  run,
  expanded,
  onToggle,
}: {
  run: WorkflowRun;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { data: logs = [] } = useRunLogsQuery(expanded ? run.id : null);
  const StatusIcon = run.status === 'success' ? CheckCircle2 : run.status === 'failed' ? XCircle : Loader2;

  return (
    <div className="border-b border-border/60 last:border-b-0">
      <button onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/30">
        <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        <StatusIcon
          className={`h-3.5 w-3.5 shrink-0 ${STATUS_STYLE[run.status]} ${
            run.status === 'running' ? 'animate-spin' : ''
          }`}
        />
        <span className="flex-1 text-[13px]">
          {new Date(run.startedAt).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </span>
        <span className={`text-xs font-medium capitalize ${STATUS_STYLE[run.status]}`}>{run.status}</span>
      </button>

      {expanded && (
        <div className="space-y-1.5 border-t border-border/60 bg-muted/20 px-4 py-3 pl-11">
          {logs.length === 0 ? (
            <p className="text-xs text-muted-foreground">Loading steps…</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 text-xs">
                <span
                  className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    log.status === 'success' || log.status === 'passed'
                      ? 'bg-emerald-500'
                      : log.status === 'failed'
                        ? 'bg-red-500'
                        : 'bg-muted-foreground'
                  }`}
                />
                <div className="min-w-0">
                  <span className="font-medium">{log.stepName}</span>
                  <span className="text-muted-foreground"> — {log.status}</span>
                  {log.detail !== null && log.detail !== undefined && (
                    <pre className="mt-0.5 overflow-x-auto rounded bg-background px-2 py-1 text-[11px] text-muted-foreground">
                      {typeof log.detail === 'string' ? log.detail : JSON.stringify(log.detail)}
                    </pre>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
