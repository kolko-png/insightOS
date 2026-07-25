import 'server-only';
import { listDocuments } from '@/lib/services/documents.service';
import { getWorkspaceContext } from '@/lib/services/workspace-context.service';

export async function getInitialDocuments() {
  return listDocuments();
}

export async function getCurrentWorkspaceId() {
  const { workspaceId } = await getWorkspaceContext();
  return workspaceId;
}
