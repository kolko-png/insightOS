import { notFound } from 'next/navigation';
import { getInitialWorkflow, getInitialRuns } from '@/features/automation/server/queries';
import { RunHistory } from '@/features/automation/components/run-history';

export default async function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ workflowId: string }>;
}) {
  const { workflowId } = await params;
  const workflow = await getInitialWorkflow(workflowId);
  if (!workflow) notFound();

  const runs = await getInitialRuns(workflowId);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-[20px] font-semibold tracking-tight">{workflow.name}</h1>
        <p className="text-sm text-muted-foreground">
          {workflow.actions.length} action{workflow.actions.length > 1 ? 's' : ''} ·{' '}
          {workflow.isActive ? 'Active' : 'Inactive'}
        </p>
      </div>

      <RunHistory workflowId={workflowId} initialRuns={runs} />
    </div>
  );
}
