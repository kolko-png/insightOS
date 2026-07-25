'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { ConversationSummary } from '@/lib/validation/copilot.schema';

export function ConversationSidebar() {
  const params = useParams<{ conversationId?: string }>();
  const router = useRouter();

  const { data: conversations = [] } = useQuery({
    queryKey: ['copilot', 'conversations'],
    queryFn: async (): Promise<ConversationSummary[]> => {
      const res = await fetch('/api/copilot/conversations');
      if (!res.ok) throw new Error('Failed to load conversations');
      return res.json();
    },
    staleTime: 10_000,
  });

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border/60">
      <div className="p-3">
        <button
          onClick={() => router.push('/copilot')}
          className="flex w-full items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-[13px] transition-colors hover:bg-accent"
        >
          <Plus className="h-3.5 w-3.5" />
          New conversation
        </button>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {conversations.map((c) => (
          <Link
            key={c.id}
            href={`/copilot/${c.id}`}
            className={cn(
              'block truncate rounded-lg px-3 py-2 text-[13px] transition-colors',
              params.conversationId === c.id
                ? 'bg-accent font-medium'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
            )}
          >
            {c.title}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
