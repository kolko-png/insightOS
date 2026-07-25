'use client';

import Link from 'next/link';
import { Zap, Clock, Radio } from 'lucide-react';
import { useToggleWorkflow } from '../hooks/use-automation';
import type { Workflow } from '@/lib/validation/automation.schema';

const TRIGGER_ICON = { threshold: Zap, schedule: Clock, event: Radio } as const;

function triggerSummary(workflow: Workflow): string {
  const c = workflow.triggerConfig as Record<string, unknown>;
  if (workflow.triggerType === 'threshold') {
    return `When ${c.metric} ${c.operator} ${c.value}`;
  }
  if (workflow.triggerType === 'schedule') {
    return c.frequency === 'hourly' ? 'Every hour' : `${c.frequency}, ${c.atHour}:00`;
  }
  return `On ${c.eventName}`;
}

export function WorkflowCard({ workflow }: { workflow: Workflow }) {
  const toggle = useToggleWorkflow();
  const Icon = TRIGGER_ICON[workflow.triggerType];

  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card p-4">
      <Link href={`/automation/${workflow.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent">
          <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-medium">{workflow.name}</p>
          <p className="truncate text-xs text-muted-foreground">{triggerSummary(workflow)}</p>
        </div>
      </Link>

      <button
        onClick={() => toggle.mutate({ id: workflow.id, isActive: !workflow.isActive })}
        role="switch"
        aria-checked={workflow.isActive}
        aria-label={workflow.isActive ? 'Deactivate workflow' : 'Activate workflow'}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          workflow.isActive ? 'bg-emerald-500' : 'bg-muted'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            workflow.isActive ? 'translate-x-[18px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}
