import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceContext } from './workspace-context.service';
import {
  documentSchema,
  type CreateDocumentInput,
  type DocumentRecord,
} from '@/lib/validation/documents.schema';

const STORAGE_BUCKET = 'documents';

function toDocumentRecord(d: {
  id: string;
  file_name: string;
  file_type: string;
  status: DocumentRecord['status'];
  category: string | null;
  version: number;
  uploaded_by: string;
  created_at: string;
}): DocumentRecord {
  return documentSchema.parse({
    id: d.id,
    fileName: d.file_name,
    fileType: d.file_type,
    status: d.status,
    category: d.category,
    version: d.version,
    uploadedBy: d.uploaded_by,
    createdAt: d.created_at,
  });
}

/**
 * Creates the metadata row only — does NOT trigger processing.
 * Triggering is the route handler's job (via Next.js `after()`, run
 * post-response) so this function stays a pure data operation,
 * testable without mocking the Snowflake pipeline.
 */
export async function createDocument(input: CreateDocumentInput): Promise<DocumentRecord> {
  const { workspaceId, userId } = await getWorkspaceContext();
  const supabase = await createClient();

  // Version chain: a new upload with the same file name in this
  // workspace supersedes the previous one rather than starting an
  // unrelated document family — see 0002_documents_versioning.sql.
  const { data: existing } = await supabase
    .from('documents')
    .select('id, version')
    .eq('workspace_id', workspaceId)
    .eq('file_name', input.fileName)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from('documents')
    .insert({
      workspace_id: workspaceId,
      uploaded_by: userId,
      file_name: input.fileName,
      file_type: input.fileType,
      storage_path: input.storagePath,
      category: input.category,
      version: (existing?.version ?? 0) + 1,
      parent_document_id: existing?.id ?? null,
      status: 'processing',
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to create document record');
  return toDocumentRecord(data);
}

export async function listDocuments(): Promise<DocumentRecord[]> {
  const { workspaceId } = await getWorkspaceContext();
  const supabase = await createClient();

  const { data } = await supabase
    .from('documents')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  return (data ?? []).map(toDocumentRecord);
}

export async function getDocumentVersionsById(documentId: string): Promise<DocumentRecord[]> {
  const { workspaceId } = await getWorkspaceContext();
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from('documents')
    .select('file_name')
    .eq('id', documentId)
    .eq('workspace_id', workspaceId)
    .single();
  if (!doc) return [];

  const { data } = await supabase
    .from('documents')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('file_name', doc.file_name)
    .order('version', { ascending: false });

  return (data ?? []).map(toDocumentRecord);
}

export async function getDocumentDownloadUrl(documentId: string): Promise<string> {
  const { workspaceId } = await getWorkspaceContext();
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('id', documentId)
    .eq('workspace_id', workspaceId)
    .single();
  if (!doc) throw new Error('Document not found');

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(doc.storage_path, 60 * 5);
  if (error || !data) throw new Error(error?.message ?? 'Failed to sign download URL');

  return data.signedUrl;
}
