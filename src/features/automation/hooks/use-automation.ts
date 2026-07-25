'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateWorkflowInput, Workflow, WorkflowRun, RunLog } from '@/lib/validation/automation.schema';

export function useWorkflowsQuery(initialData: Workflow[]) {
  return useQuery({
    queryKey: ['automation', 'workflows'],
    queryFn: async (): Promise<Workflow[]> => {
      const res = await fetch('/api/automation/workflows');
      if (!res.ok) throw new Error('Failed to load workflows');
      return res.json();
    },
    initialData,
  });
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateWorkflowInput): Promise<Workflow> => {
      const res = await fetch('/api/automation/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to create workflow');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation', 'workflows'] });
    },
  });
}

export function useToggleWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/automation/workflows/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error('Failed to update workflow');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation', 'workflows'] });
    },
  });
}

export function useRunWorkflowNow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/automation/workflows/${id}/run`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to run workflow');
      }
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['automation', 'runs', id] });
    },
  });
}

export function useWorkflowRunsQuery(workflowId: string, initialData: WorkflowRun[]) {
  return useQuery({
    queryKey: ['automation', 'runs', workflowId],
    queryFn: async (): Promise<WorkflowRun[]> => {
      const res = await fetch(`/api/automation/workflows/${workflowId}/runs`);
      if (!res.ok) throw new Error('Failed to load run history');
      return res.json();
    },
    initialData,
    // Runs can be in-flight — poll briefly so a manually-triggered
    // run's status updates without a manual page refresh.
    refetchInterval: (query) => {
      const runs = query.state.data ?? [];
      return runs.some((r) => r.status === 'pending' || r.status === 'running') ? 3000 : false;
    },
  });
}

export function useRunLogsQuery(runId: string | null) {
  return useQuery({
    queryKey: ['automation', 'logs', runId],
    queryFn: async (): Promise<RunLog[]> => {
      const res = await fetch(`/api/automation/runs/${runId}/logs`);
      if (!res.ok) throw new Error('Failed to load logs');
      return res.json();
    },
    enabled: !!runId,
  });
}
