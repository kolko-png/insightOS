import 'server-only';
import { listWorkflows, getWorkflow, getWorkflowRuns } from '@/lib/services/automation.service';

export async function getInitialWorkflows() {
  return listWorkflows();
}

export async function getInitialWorkflow(id: string) {
  return getWorkflow(id);
}

export async function getInitialRuns(id: string) {
  return getWorkflowRuns(id);
}
