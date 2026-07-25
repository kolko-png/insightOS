'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateWorkflow } from '../hooks/use-automation';
import type { Action, Condition, CreateWorkflowInput } from '@/lib/validation/automation.schema';

type TriggerType = CreateWorkflowInput['triggerType'];

const DEFAULT_ACTION: Action = { type: 'notify', title: '', notifyType: 'info' };

export function WorkflowBuilder() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState<TriggerType>('threshold');
  const [triggerConfig, setTriggerConfig] = useState<Record<string, unknown>>({
    metric: 'inventory',
    operator: '<',
    value: 100,
  });
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [actions, setActions] = useState<Action[]>([{ ...DEFAULT_ACTION }]);
  const [error, setError] = useState<string | null>(null);

  const createWorkflow = useCreateWorkflow();

  const reset = () => {
    setName('');
    setTriggerType('threshold');
    setTriggerConfig({ metric: 'inventory', operator: '<', value: 100 });
    setConditions([]);
    setActions([{ ...DEFAULT_ACTION }]);
    setError(null);
  };

  const submit = async () => {
    setError(null);
    try {
      await createWorkflow.mutateAsync({ name, triggerType, triggerConfig, conditions, actions });
      setOpen(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workflow');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          New workflow
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New workflow</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wf-name">Name</Label>
            <Input
              id="wf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Low inventory alert"
            />
          </div>

          {/* ---------- TRIGGER ---------- */}
          <section className="space-y-3 rounded-xl border border-border/60 p-4">
            <h3 className="text-[13px] font-medium">1. Trigger</h3>

            <Select value={triggerType} onValueChange={(v) => {
              const next = v as TriggerType;
              setTriggerType(next);
              setTriggerConfig(
                next === 'threshold'
                  ? { metric: 'inventory', operator: '<', value: 100 }
                  : next === 'schedule'
                    ? { frequency: 'daily', atHour: 9 }
                    : { eventName: 'document_processed' }
              );
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="threshold">When a metric crosses a threshold</SelectItem>
                <SelectItem value="schedule">On a schedule</SelectItem>
                <SelectItem value="event">When an event happens</SelectItem>
              </SelectContent>
            </Select>

            {triggerType === 'threshold' && (
              <div className="grid grid-cols-3 gap-2">
                <Select
                  value={String(triggerConfig.metric)}
                  onValueChange={(v) => setTriggerConfig((c) => ({ ...c, metric: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inventory">Inventory</SelectItem>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="expenses">Expenses</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={String(triggerConfig.operator)}
                  onValueChange={(v) => setTriggerConfig((c) => ({ ...c, operator: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="<">is below</SelectItem>
                    <SelectItem value="<=">is at or below</SelectItem>
                    <SelectItem value=">">is above</SelectItem>
                    <SelectItem value=">=">is at or above</SelectItem>
                    <SelectItem value="==">equals</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={Number(triggerConfig.value)}
                  onChange={(e) => setTriggerConfig((c) => ({ ...c, value: Number(e.target.value) }))}
                />
              </div>
            )}

            {triggerType === 'schedule' && (
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={String(triggerConfig.frequency)}
                  onValueChange={(v) => setTriggerConfig((c) => ({ ...c, frequency: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Every hour</SelectItem>
                    <SelectItem value="daily">Every day</SelectItem>
                    <SelectItem value="weekly">Every week</SelectItem>
                  </SelectContent>
                </Select>
                {triggerConfig.frequency !== 'hourly' && (
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={Number(triggerConfig.atHour ?? 9)}
                    onChange={(e) => setTriggerConfig((c) => ({ ...c, atHour: Number(e.target.value) }))}
                    placeholder="Hour (0–23)"
                  />
                )}
              </div>
            )}

            {triggerType === 'event' && (
              <Select
                value={String(triggerConfig.eventName)}
                onValueChange={(v) => setTriggerConfig((c) => ({ ...c, eventName: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="document_processed">A document finishes processing</SelectItem>
                </SelectContent>
              </Select>
            )}
          </section>

          {/* ---------- CONDITIONS ---------- */}
          <section className="space-y-3 rounded-xl border border-border/60 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-medium">2. Conditions (optional)</h3>
              <button
                onClick={() => setConditions((c) => [...c, { field: '', operator: 'equals', value: '' }])}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                + Add condition
              </button>
            </div>
            {conditions.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No extra conditions — actions run whenever the trigger fires.
              </p>
            )}
            {conditions.map((cond, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  placeholder="field"
                  value={cond.field}
                  onChange={(e) =>
                    setConditions((cs) => cs.map((c, j) => (j === i ? { ...c, field: e.target.value } : c)))
                  }
                  className="flex-1"
                />
                <Select
                  value={cond.operator}
                  onValueChange={(v) =>
                    setConditions((cs) =>
                      cs.map((c, j) => (j === i ? { ...c, operator: v as Condition['operator'] } : c))
                    )
                  }
                >
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">equals</SelectItem>
                    <SelectItem value="not_equals">not equals</SelectItem>
                    <SelectItem value="greater_than">greater than</SelectItem>
                    <SelectItem value="less_than">less than</SelectItem>
                    <SelectItem value="contains">contains</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="value"
                  value={String(cond.value)}
                  onChange={(e) =>
                    setConditions((cs) => cs.map((c, j) => (j === i ? { ...c, value: e.target.value } : c)))
                  }
                  className="flex-1"
                />
                <button onClick={() => setConditions((cs) => cs.filter((_, j) => j !== i))} aria-label="Remove condition">
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
          </section>

          {/* ---------- ACTIONS ---------- */}
          <section className="space-y-3 rounded-xl border border-border/60 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-medium">3. Actions (run in order)</h3>
              <button
                onClick={() => setActions((a) => [...a, { ...DEFAULT_ACTION }])}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                + Add action
              </button>
            </div>

            {actions.map((action, i) => (
              <ActionEditor
                key={i}
                index={i}
                action={action}
                onChange={(next) => setActions((as) => as.map((a, j) => (j === i ? next : a)))}
                onRemove={actions.length > 1 ? () => setActions((as) => as.filter((_, j) => j !== i)) : undefined}
              />
            ))}
          </section>

          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}

          <Button
            onClick={submit}
            disabled={createWorkflow.isPending || !name.trim()}
            className="w-full"
          >
            {createWorkflow.isPending ? 'Creating…' : 'Create workflow'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ActionEditor({
  index,
  action,
  onChange,
  onRemove,
}: {
  index: number;
  action: Action;
  onChange: (action: Action) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="space-y-2 rounded-lg bg-muted/40 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Step {index + 1}</span>
        {onRemove && (
          <button onClick={onRemove} aria-label="Remove action">
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
          </button>
        )}
      </div>

      <Select
        value={action.type}
        onValueChange={(v) => {
          if (v === 'notify') onChange({ type: 'notify', title: '', notifyType: 'info' });
          if (v === 'create_purchase_request') onChange({ type: 'create_purchase_request', quantity: 0 });
          if (v === 'send_email') onChange({ type: 'send_email', to: '', subject: '', body: '' });
        }}
      >
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="notify">Send a notification</SelectItem>
          <SelectItem value="create_purchase_request">Create a purchase request</SelectItem>
          <SelectItem value="send_email">Send an email</SelectItem>
        </SelectContent>
      </Select>

      {action.type === 'notify' && (
        <div className="space-y-2">
          <Input
            placeholder="Notification title"
            value={action.title}
            onChange={(e) => onChange({ ...action, title: e.target.value })}
          />
          <Select
            value={action.notifyType}
            onValueChange={(v) => onChange({ ...action, notifyType: v as 'info' | 'task' | 'alert' })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="task">Task</SelectItem>
              <SelectItem value="alert">Alert</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {action.type === 'create_purchase_request' && (
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Supplier ID (optional)"
            value={action.supplierId ?? ''}
            onChange={(e) => onChange({ ...action, supplierId: e.target.value })}
          />
          <Input
            type="number"
            placeholder="Quantity"
            value={action.quantity}
            onChange={(e) => onChange({ ...action, quantity: Number(e.target.value) })}
          />
        </div>
      )}

      {action.type === 'send_email' && (
        <div className="space-y-2">
          <Input
            placeholder="To (email address)"
            value={action.to}
            onChange={(e) => onChange({ ...action, to: e.target.value })}
          />
          <Input
            placeholder="Subject"
            value={action.subject}
            onChange={(e) => onChange({ ...action, subject: e.target.value })}
          />
          <textarea
            placeholder="Body"
            value={action.body}
            onChange={(e) => onChange({ ...action, body: e.target.value })}
            rows={3}
            className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-[13px] outline-none"
          />
        </div>
      )}
    </div>
  );
}
