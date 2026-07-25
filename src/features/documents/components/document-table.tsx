'use client';

import { useMemo, useState } from 'react';
import { FileText, Download, ChevronRight } from 'lucide-react';
import { useDocumentsQuery } from '../hooks/use-documents-query';
import { StatusBadge } from './status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import type { DocumentRecord } from '@/lib/validation/documents.schema';

export function DocumentTable({ initialData }: { initialData: DocumentRecord[] }) {
  const { data: documents = [] } = useDocumentsQuery(initialData);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const categories = useMemo(
    () => [
      'all',
      ...Array.from(new Set(documents.map((d) => d.category).filter(Boolean) as string[])),
    ],
    [documents]
  );

  // Only the latest version of each file name is a top-level row —
  // older versions surface via the expand toggle, not as separate,
  // confusingly-duplicate rows.
  const latestByFile = useMemo(() => {
    const map = new Map<string, DocumentRecord>();
    for (const doc of documents) {
      const existing = map.get(doc.fileName);
      if (!existing || doc.version > existing.version) map.set(doc.fileName, doc);
    }
    return Array.from(map.values());
  }, [documents]);

  const filtered = latestByFile.filter((d) => {
    const matchesSearch = d.fileName.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'all' || d.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search documents…"
          className="flex-1 rounded-lg border border-border/60 bg-card px-3 py-2 text-[13px] outline-none placeholder:text-muted-foreground"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-border/60 bg-card px-3 py-2 text-[13px]"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === 'all' ? 'All categories' : c}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents"
          description="Upload a file above to make it searchable by the AI Copilot."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/60">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-border/60 bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Category</th>
                <th className="px-4 py-2.5 font-medium">Version</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Uploaded</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((doc) => (
                <DocumentRow key={doc.id} document={doc} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DocumentRow({ document }: { document: DocumentRecord }) {
  const [expanded, setExpanded] = useState(false);
  const [versions, setVersions] = useState<DocumentRecord[] | null>(null);

  const toggleVersions = async () => {
    if (!expanded && !versions) {
      const res = await fetch(`/api/documents/${document.id}/versions`);
      if (res.ok) setVersions(await res.json());
    }
    setExpanded((e) => !e);
  };

  return (
    <>
      <tr className="hover:bg-accent/30">
        <td className="flex items-center gap-2 px-4 py-3">
          {document.version > 1 && (
            <button onClick={toggleVersions} aria-label="Show version history">
              <ChevronRight
                className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
              />
            </button>
          )}
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{document.fileName}</span>
        </td>
        <td className="px-4 py-3 text-muted-foreground">{document.category ?? '—'}</td>
        <td className="px-4 py-3 text-muted-foreground">v{document.version}</td>
        <td className="px-4 py-3">
          <StatusBadge status={document.status} />
        </td>
        <td className="px-4 py-3 text-muted-foreground">
          {new Date(document.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </td>
        <td className="px-4 py-3 text-right">
          <a
            href={`/api/documents/${document.id}/download-url`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            aria-label="Download document"
          >
            <Download className="h-3.5 w-3.5" />
          </a>
        </td>
      </tr>
      {expanded &&
        versions
          ?.slice(1)
          .map((v) => (
            <tr key={v.id} className="bg-muted/20 text-muted-foreground">
              <td className="py-2 pl-11 pr-4">{v.fileName}</td>
              <td className="px-4 py-2">{v.category ?? '—'}</td>
              <td className="px-4 py-2">v{v.version}</td>
              <td className="px-4 py-2">
                <StatusBadge status={v.status} />
              </td>
              <td className="px-4 py-2">
                {new Date(v.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </td>
              <td />
            </tr>
          ))}
    </>
  );
}
