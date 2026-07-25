import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { queryAsWorkspace } from '@/lib/snowflake/client';
import { workspaceRoleName } from '@/lib/snowflake/roles';
import { sendEmail } from '@/lib/email/resend';
import { evaluateCondition, matchesSchedule, startOfDay } from '@/lib/utils/automation-rules';
import { oneToOne } from '@/lib/utils/supabase-embed';
import type {
  Action,
  Condition,
  ThresholdTriggerConfig,
  ScheduleTriggerConfig,
} from '@/lib/validation/automation.schema';

export async function evaluateThresholdWorkflows(): Promise<void> {
  const admin = createAdminClient();

  const { data: workflows } = await admin
    .from('automation_workflows')
    .select('*, workspaces(snowflake_workspace_key)')
    .eq('trigger_type', 'threshold')
    .eq('is_active', true);

  for (const wf of workflows ?? []) {
    const workspaceKey = oneToOne(wf.workspaces)?.snowflake_workspace_key;
    if (!workspaceKey) continue;

    try {
      const config = wf.trigger_config as ThresholdTriggerConfig;
      const shouldRun = await evaluateThreshold(workspaceRoleName(workspaceKey), config);
      if (!shouldRun) continue;

      const { data: recentRun } = await admin
        .from('automation_runs')
        .select('id')
        .eq('workflow_id', wf.id)
        .gte('started_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .limit(1)
        .maybeSingle();

      if (!recentRun) {
        await runWorkflow(wf.id, { reason: 'threshold_met', ...config });
      }
    } catch (err) {
      console.error(`[automation] threshold evaluation failed for workflow ${wf.id}`, err);
    }
  }
}

async function evaluateThreshold(role: string, config: ThresholdTriggerConfig): Promise<boolean> {
  let current: number;

  if (config.metric === 'inventory') {
    const rows = await queryAsWorkspace<{ MIN_QTY: number | null }>(
      role,
      `select min(quantity_on_hand) as MIN_QTY from INVENTORY where quantity_on_hand < reorder_threshold`
    );
    current = rows[0]?.MIN_QTY ?? Infinity;
  } else if (config.metric === 'revenue') {
    const rows = await queryAsWorkspace<{ TOTAL: number }>(
      role,
      `select coalesce(sum(amount), 0) as TOTAL from REVENUE where recorded_at >= date_trunc('month', current_date())`
    );
    current = rows[0]?.TOTAL ?? 0;
  } else {
    const rows = await queryAsWorkspace<{ TOTAL: number }>(
      role,
      `select coalesce(sum(amount), 0) as TOTAL from EXPENSES where recorded_at >= date_trunc('month', current_date())`
    );
    current = rows[0]?.TOTAL ?? 0;
  }

  switch (config.operator) {
    case '<':
      return current < config.value;
    case '<=':
      return current <= config.value;
    case '>':
      return current > config.value;
    case '>=':
      return current >= config.value;
    case '==':
      return current === config.value;
    default:
      return false;
  }
}



export async function evaluateScheduleWorkflows(): Promise<void> {
  const admin = createAdminClient();
  const now = new Date();

  const { data: workflows } = await admin
    .from('automation_workflows')
    .select('*')
    .eq('trigger_type', 'schedule')
    .eq('is_active', true);

  for (const wf of workflows ?? []) {
    const config = wf.trigger_config as ScheduleTriggerConfig;
    if (!matchesSchedule(config, now)) continue;


    const { data: recentRun } = await admin
      .from('automation_runs')
      .select('id')
      .eq('workflow_id', wf.id)
      .gte('started_at', startOfDay(now).toISOString())
      .limit(1)
      .maybeSingle();

    if (!recentRun) {
      await runWorkflow(wf.id, { reason: 'schedule', firedAt: now.toISOString() }).catch((err) =>
        console.error(`[automation] scheduled run failed for workflow ${wf.id}`, err)
      );
    }
  }
}


export async function triggerEvent(
  workspaceId: string,
  eventName: string,
  payload: Record<string, unknown> = {}
): Promise<void> {
  const admin = createAdminClient();

  const { data: workflows } = await admin
    .from('automation_workflows')
    .select('id, trigger_config')
    .eq('workspace_id', workspaceId)
    .eq('trigger_type', 'event')
    .eq('is_active', true);

  for (const wf of workflows ?? []) {
    const config = wf.trigger_config as { eventName?: string };
    if (config.eventName !== eventName) continue;

    await runWorkflow(wf.id, { reason: 'event', eventName, ...payload }).catch((err) =>
      console.error(`[automation] event-triggered run failed for workflow ${wf.id}`, err)
    );
  }
}



async function executeAction(
  action: Action,
  ctx: { workspaceId: string; workspaceKey?: string; triggerPayload: Record<string, unknown> }
): Promise<unknown> {
  const admin = createAdminClient();

  switch (action.type) {
    case 'notify': {
      const { data, error } = await admin
        .from('notifications')
        .insert({
          workspace_id: ctx.workspaceId,
          type: action.notifyType,
          title: action.title,
          body: action.body ?? null,
          source: 'automation',
        })
        .select('id')
        .single();
      if (error) throw error;
      return { notificationId: data.id };
    }

    case 'create_purchase_request': {
      if (!ctx.workspaceKey) throw new Error('Missing workspace key for purchase request');
      const role = workspaceRoleName(ctx.workspaceKey);
      // Generated client-side rather than relying on an INSERT...
      // RETURNING clause — kept the SQL to patterns already verified
      // in this project (Phase 8) rather than introducing an
      // unverified feature for one call site.
      const requestId = crypto.randomUUID();

      await queryAsWorkspace(
        role,
        `insert into PURCHASE_REQUESTS (request_id, workspace_key, sku, supplier_id, quantity, status)
         select ?, ?, ?, ?, ?, 'draft'`,
        [
          requestId,
          ctx.workspaceKey,
          (ctx.triggerPayload.sku as string) ?? null,
          action.supplierId ?? null,
          action.quantity,
        ]
      );
      return { requestId };
    }

    case 'send_email': {

      return sendEmail({ to: action.to, subject: action.subject, body: action.body });
    }

    default: {
      const exhaustiveCheck: never = action;
      throw new Error(`Unknown action type: ${JSON.stringify(exhaustiveCheck)}`);
    }
  }
}


export async function runWorkflow(
  workflowId: string,
  triggerPayload: Record<string, unknown>
): Promise<void> {
  const admin = createAdminClient();

  const { data: workflow, error } = await admin
    .from('automation_workflows')
    .select('*, workspaces(snowflake_workspace_key)')
    .eq('id', workflowId)
    .single();

  if (error || !workflow) throw new Error(`Workflow ${workflowId} not found`);

  const { data: run, error: runError } = await admin
    .from('automation_runs')
    .insert({ workflow_id: workflowId, status: 'running', trigger_payload: triggerPayload })
    .select()
    .single();
  if (runError || !run) throw new Error('Failed to create run record');

  const log = (stepName: string, status: string, detail?: unknown) =>
    admin.from('automation_logs').insert({ run_id: run.id, step_name: stepName, status, detail });

  try {
    const conditions = (workflow.conditions ?? []) as Condition[];
    for (const cond of conditions) {
      const actual = triggerPayload[cond.field];
      const passed = evaluateCondition(actual, cond.operator, cond.value);
      await log(`condition:${cond.field}`, passed ? 'passed' : 'failed', {
        actual,
        expected: cond.value,
      });

      if (!passed) {
        await admin
          .from('automation_runs')
          .update({ status: 'success', finished_at: new Date().toISOString() })
          .eq('id', run.id);
        await log('run', 'skipped_condition_not_met');
        return;
      }
    }

    const actions = (workflow.actions ?? []) as Action[];
    for (const [i, action] of actions.entries()) {
      try {
        const result = await executeAction(action, {
          workspaceId: workflow.workspace_id,
          workspaceKey: oneToOne(workflow.workspaces)?.snowflake_workspace_key,
          triggerPayload,
        });
        await log(`action:${i}:${action.type}`, 'success', result);
      } catch (actionErr) {
        await log(`action:${i}:${action.type}`, 'failed', { error: String(actionErr) });
        throw actionErr;
      }
    }

    await admin
      .from('automation_runs')
      .update({ status: 'success', finished_at: new Date().toISOString() })
      .eq('id', run.id);
  } catch (err) {
    await admin
      .from('automation_runs')
      .update({ status: 'failed', finished_at: new Date().toISOString() })
      .eq('id', run.id);
    throw err;
  }
}