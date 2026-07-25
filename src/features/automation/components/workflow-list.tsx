'use client';

import { Workflow as WorkflowIcon } from 'lucide-react';
import { useWorkflowsQuery } from '../hooks/use-automation';
import { WorkflowCard } from './workflow-card';
import { EmptyState } from '@/components/shared/empty-state';
import type { Workflow } from '@/lib/validation/automation.schema';

export function WorkflowList({ initialData }: { initialData: Workflow[] }) {
  const { data: workflows = [] } = useWorkflowsQuery(initialData);

  if (workflows.length === 0) {
    return (
      <EmptyState
        icon={WorkflowIcon}
        title="No workflows yet"
        description="Create one below to automate a repetitive task, like alerting warehouse staff when stock runs low."
      />
    );
  }

  return (
    <div className="space-y-2">
      {workflows.map((wf) => (
        <WorkflowCard key={wf.id} workflow={wf} />
      ))}
    </div>
  );
}
