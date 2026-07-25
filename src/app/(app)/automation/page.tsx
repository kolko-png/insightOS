import { getInitialWorkflows } from '@/features/automation/server/queries';
import { WorkflowList } from '@/features/automation/components/workflow-list';
import { WorkflowBuilder } from '@/features/automation/components/workflow-builder';

export default async function AutomationPage() {
  const workflows = await getInitialWorkflows();

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Automation</h1>
          <p className="text-sm text-muted-foreground">
            Trigger → condition → action workflows that run without you.
          </p>
        </div>
        <WorkflowBuilder />
      </div>

      <WorkflowList initialData={workflows} />
    </div>
  );
}
