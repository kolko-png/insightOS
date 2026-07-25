'use client';

import { useState } from 'react';
import { FileText, Database, ChevronDown } from 'lucide-react';
import type { Citation } from '@/lib/validation/copilot.schema';

export function CitationPanel({ citations }: { citations: Citation[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full rounded-lg border border-border/60 bg-muted/40">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-1.5 text-[11px] text-muted-foreground"
      >
        <span>
          {citations.length} source{citations.length > 1 ? 's' : ''}
        </span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul className="space-y-1 border-t border-border/60 px-3 py-2">
          {citations.map((c, i) => (
            <li key={i} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              {c.type === 'query' ? (
                <Database className="h-3 w-3 shrink-0" />
              ) : (
                <FileText className="h-3 w-3 shrink-0" />
              )}
              <span className="truncate">
                {c.label} — {c.source}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
