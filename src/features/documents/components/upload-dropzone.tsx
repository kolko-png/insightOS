'use client';

import { useCallback, useRef, useState, type DragEvent } from 'react';
import { UploadCloud } from 'lucide-react';
import { useUploadDocument } from '../hooks/use-upload-document';
import { cn } from '@/lib/utils/cn';

export function UploadDropzone({ workspaceId }: { workspaceId: string }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading, progressLabel } = useUploadDocument(workspaceId);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return;
      Array.from(files).forEach((file) => upload(file));
    },
    [upload]
  );

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors',
        isDragging ? 'border-foreground bg-accent/40' : 'border-border hover:border-foreground/30'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        accept=".pdf,.csv,.xlsx,.xls,.docx,.doc,.png,.jpg,.jpeg"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <UploadCloud className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
      <p className="text-[13px] font-medium">
        {isUploading ? progressLabel : 'Drop files here or click to upload'}
      </p>
      <p className="text-xs text-muted-foreground">PDF, CSV, Excel, Word, or images</p>
    </div>
  );
}
