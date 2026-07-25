import { getInitialDocuments, getCurrentWorkspaceId } from '@/features/documents/server/queries';
import { UploadDropzone } from '@/features/documents/components/upload-dropzone';
import { DocumentTable } from '@/features/documents/components/document-table';

export default async function DocumentsPage() {
  const [documents, workspaceId] = await Promise.all([
    getInitialDocuments(),
    getCurrentWorkspaceId(),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="text-[20px] font-semibold tracking-tight">Document Center</h1>
        <p className="text-sm text-muted-foreground">
          Upload files to make them searchable by the AI Copilot.
        </p>
      </div>

      <UploadDropzone workspaceId={workspaceId} />
      <DocumentTable initialData={documents} />
    </div>
  );
}
