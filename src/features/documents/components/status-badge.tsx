import { cn } from '@/lib/utils/cn';
import type { DocumentRecord } from '@/lib/validation/documents.schema';

const STYLES: Record<DocumentRecord['status'], string> = {
  uploading: 'bg-muted text-muted-foreground',
  processing: 'bg-amber-500/10 text-amber-600',
  embedded: 'bg-emerald-500/10 text-emerald-600',
  failed: 'bg-red-500/10 text-red-600',
};

const LABELS: Record<DocumentRecord['status'], string> = {
  uploading: 'Uploading',
  processing: 'Processing',
  embedded: 'Indexed',
  failed: 'Failed',
};

export function StatusBadge({ status }: { status: DocumentRecord['status'] }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
        STYLES[status]
      )}
    >
      {status === 'processing' && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      )}
      {LABELS[status]}
    </span>
  );
}
