import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceContext } from '@/lib/services/workspace-context.service';
import {
  conversationSummarySchema,
  messageSchema,
  type ConversationSummary,
  type Message,
} from '@/lib/validation/copilot.schema';

export async function getConversations(): Promise<ConversationSummary[]> {
  const { workspaceId, userId } = await getWorkspaceContext();
  const supabase = await createClient();

  const { data } = await supabase
    .from('conversations')
    .select('id, title, updated_at')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(50);

  return (data ?? []).map((c) =>
    conversationSummarySchema.parse({ id: c.id, title: c.title, updatedAt: c.updated_at })
  );
}

export async function getConversationMessages(conversationId: string): Promise<Message[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('messages')
    .select('id, role, content, citations, reasoning, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  return (data ?? []).map((m) =>
    messageSchema.parse({
      id: m.id,
      role: m.role,
      content: m.content,
      citations: m.citations ?? [],
      reasoning: m.reasoning,
      createdAt: m.created_at,
    })
  );
}
