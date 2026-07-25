import { z } from 'zod';

export const triggerTypeSchema = z.enum(['schedule', 'event', 'threshold']);

export const thresholdTriggerConfigSchema = z.object({
  metric: z.enum(['inventory', 'revenue', 'expenses']),
  operator: z.enum(['<', '<=', '>', '>=', '==']),
  value: z.number(),
});
export type ThresholdTriggerConfig = z.infer<typeof thresholdTriggerConfigSchema>;

export const scheduleTriggerConfigSchema = z.object({
  frequency: z.enum(['hourly', 'daily', 'weekly']),
  atHour: z.number().min(0).max(23).default(9),
  dayOfWeek: z.number().min(0).max(6).optional(), // 0 = Sunday, only used when frequency is 'weekly'
});
export type ScheduleTriggerConfig = z.infer<typeof scheduleTriggerConfigSchema>;

export const eventTriggerConfigSchema = z.object({
  // Deliberately a small closed set rather than a free-text field —
  // an event name only means something if something in the codebase
  // actually calls triggerEvent() with it. See automation-engine
  // .service.ts and document-processing.service.ts for the one
  // currently-wired event.
  eventName: z.enum(['document_processed']),
});
export type EventTriggerConfig = z.infer<typeof eventTriggerConfigSchema>;

export const conditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(['equals', 'not_equals', 'greater_than', 'less_than', 'contains']),
  value: z.union([z.string(), z.number()]),
});
export type Condition = z.infer<typeof conditionSchema>;

export const actionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('notify'),
    title: z.string().min(1),
    body: z.string().optional(),
    notifyType: z.enum(['info', 'task', 'alert']).default('info'),
  }),
  z.object({
    type: z.literal('create_purchase_request'),
    supplierId: z.string().optional(),
    quantity: z.number().default(0),
  }),
  z.object({
    type: z.literal('send_email'),
    to: z.string().email(),
    subject: z.string().min(1),
    body: z.string().min(1),
  }),
]);
export type Action = z.infer<typeof actionSchema>;

export const createWorkflowSchema = z.object({
  name: z.string().min(2, 'Give this workflow a name'),
  triggerType: triggerTypeSchema,
  triggerConfig: z.record(z.string(), z.unknown()),
  conditions: z.array(conditionSchema).default([]),
  actions: z.array(actionSchema).min(1, 'Add at least one action'),
});
export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;

export const workflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  triggerType: triggerTypeSchema,
  triggerConfig: z.record(z.string(), z.unknown()),
  conditions: z.array(conditionSchema),
  actions: z.array(actionSchema),
  isActive: z.boolean(),
  createdAt: z.string(),
});
export type Workflow = z.infer<typeof workflowSchema>;

export const runStatusSchema = z.enum(['pending', 'running', 'success', 'failed']);
export const runSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  status: runStatusSchema,
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
});
export type WorkflowRun = z.infer<typeof runSchema>;

export const logSchema = z.object({
  id: z.string(),
  stepName: z.string(),
  status: z.string(),
  detail: z.unknown().nullable(),
  createdAt: z.string(),
});
export type RunLog = z.infer<typeof logSchema>;
