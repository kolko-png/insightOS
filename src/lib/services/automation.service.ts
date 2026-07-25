import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceContext } from './workspace-context.service';
import { runWorkflow } from './automation-engine.service';
import {
  workflowSchema,
  runSchema,
  logSchema,
  type CreateWorkflowInput,
  type Workflow,
  type WorkflowRun,
  type RunLog,
} from '@/lib/validation/automation.schema';

function toWorkflow(d: {
  id: string;
  name: string;
  trigger_type: Workflow['triggerType'];
  trigger_config: Record<string, unknown>;
  conditions: Workflow['conditions'];
  actions: Workflow['actions'];
  is_active: boolean;
  created_at: string;
}): Workflow {
  return workflowSchema.parse({
    id: d.id,
    name: d.name,
    triggerType: d.trigger_type,
    triggerConfig: d.trigger_config,
    conditions: d.conditions ?? [],
    actions: d.actions ?? [],
    isActive: d.is_active,
    createdAt: d.created_at,
  });
}

export async function createWorkflow(input: CreateWorkflowInput): Promise<Workflow> {
  const { workspaceId, userId } = await getWorkspaceContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('automation_workflows')
    .insert({
      workspace_id: workspaceId,
      name: input.name,
      trigger_type: input.triggerType,
      trigger_config: input.triggerConfig,
      conditions: input.conditions,
      actions: input.actions,
      created_by: userId,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to create workflow');
  return toWorkflow(data);
}

export async function listWorkflows(): Promise<Workflow[]> {
  const { workspaceId } = await getWorkspaceContext();
  const supabase = await createClient();

  const { data } = await supabase
    .from('automation_workflows')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  return (data ?? []).map(toWorkflow);
}

export async function getWorkflow(workflowId: string): Promise<Workflow | null> {
  const { workspaceId } = await getWorkspaceContext();
  const supabase = await createClient();

  const { data } = await supabase
    .from('automation_workflows')
    .select('*')
    .eq('id', workflowId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  return data ? toWorkflow(data) : null;
}

export async function setWorkflowActive(workflowId: string, isActive: boolean): Promise<void> {
  const { workspaceId } = await getWorkspaceContext();
  const supabase = await createClient();

  const { error } = await supabase
    .from('automation_workflows')
    .update({ is_active: isActive })
    .eq('id', workflowId)
    .eq('workspace_id', workspaceId);

  if (error) throw error;
}

/**
 * Manual "run now" — lets a user test a workflow without waiting
 * for its real trigger to fire. Reuses the exact same runWorkflow()
 * the cron job and event triggers call, with a payload that marks
 * the run as manually initiated so it's distinguishable in the log
 * view from an automatic run.
 */
export async function runWorkflowManually(workflowId: string): Promise<void> {
  const { workspaceId } = await getWorkspaceContext();
  const workflow = await getWorkflow(workflowId);
  if (!workflow) throw new Error('Workflow not found');

  await runWorkflow(workflowId, { reason: 'manual', workspaceId, firedAt: new Date().toISOString() });
}

export async function getWorkflowRuns(workflowId: string): Promise<WorkflowRun[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('automation_runs')
    .select('*')
    .eq('workflow_id', workflowId)
    .order('started_at', { ascending: false })
    .limit(20);

  return (data ?? []).map((r) =>
    runSchema.parse({
      id: r.id,
      workflowId: r.workflow_id,
      status: r.status,
      startedAt: r.started_at,
      finishedAt: r.finished_at,
    })
  );
}

export async function getRunLogs(runId: string): Promise<RunLog[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('automation_logs')
    .select('*')
    .eq('run_id', runId)
    .order('created_at', { ascending: true });

  return (data ?? []).map((l) =>
    logSchema.parse({
      id: l.id,
      stepName: l.step_name,
      status: l.status,
      detail: l.detail,
      createdAt: l.created_at,
    })
  );
}
