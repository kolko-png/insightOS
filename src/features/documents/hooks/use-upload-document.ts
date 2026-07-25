'use client';

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

const STORAGE_BUCKET = 'documents';

/**
 * Uploads directly from the browser to Supabase Storage rather than
 * proxying bytes through a Next.js Route Handler — a multi-MB PDF
 * would otherwise count against the serverless function's request
 * body size limit. Storage RLS (0003_documents_storage.sql) is what
 * makes this safe to do client-side: the workspace_id path prefix
 * is checked against real membership, not trusted from the client.
 */
export function useUploadDocument(workspaceId: string) {
  const [isUploading, setIsUploading] = useState(false);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const upload = useCallback(
    async (file: File, category?: string) => {
      setIsUploading(true);
      setProgressLabel('Uploading file…');
      try {
        const supabase = createClient();
        const storagePath = `${workspaceId}/${crypto.randomUUID()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, file, { upsert: false });
        if (uploadError) throw uploadError;

        setProgressLabel('Registering document…');
        const res = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type || 'application/octet-stream',
            storagePath,
            category,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? 'Failed to register document');
        }

        await queryClient.invalidateQueries({ queryKey: ['documents'] });
      } finally {
        setIsUploading(false);
        setProgressLabel(null);
      }
    },
    [workspaceId, queryClient]
  );

  return { upload, isUploading, progressLabel };
}
