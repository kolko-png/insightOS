import { type NextRequest } from 'next/server';
import { sendMessageSchema } from '@/lib/validation/copilot.schema';
import { getWorkspaceContext } from '@/lib/services/workspace-context.service';
import { createClient } from '@/lib/supabase/server';
import { firstIssueMessage } from '@/lib/utils/zod-error';
import {
  streamChatResponse,
  persistAssistantMessage,
  persistUserMessage,
} from '@/lib/services/copilot.service';


export const runtime = 'nodejs';


export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: firstIssueMessage(parsed.error) }), { status: 400 });
  }

  const { workspaceId, workspaceKey, snowflakeRole, userId } = await getWorkspaceContext();
  const supabase = await createClient();

  let conversationId = parsed.data.conversationId;
  if (!conversationId) {
    const title = parsed.data.message.slice(0, 60);
    const { data, error } = await supabase
      .from('conversations')
      .insert({ workspace_id: workspaceId, user_id: userId, title })
      .select('id')
      .single();

    if (error || !data) {
      return new Response(JSON.stringify({ error: 'Failed to create conversation' }), { status: 500 });
    }

    conversationId = data.id as string;
  }

  const { data: historyRows } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(20);

  await persistUserMessage(conversationId, parsed.data.message);

  const history = (historyRows ?? []).filter(
    (m): m is { role: 'user' | 'assistant'; content: string } =>
      m.role === 'user' || m.role === 'assistant'
  );

  const encoder = new TextEncoder();
  const finalConversationId = conversationId;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));

      // Sent first so the client can sync the URL immediately when
      // this request just created a new conversation.
      send({ type: 'conversation', id: finalConversationId });

      try {
        for await (const event of streamChatResponse({
          workspaceRole: snowflakeRole,
          workspaceKey,
          userMessage: parsed.data.message,
          history,
        })) {
          send(event);
          if (event.type === 'done') {
            await persistAssistantMessage({
              conversationId: finalConversationId,
              fullText: event.fullText,
              citations: event.citations,
              reasoning: event.reasoning,
            });
          }
        }
      } catch (err) {
        send({ type: 'error', message: err instanceof Error ? err.message : 'Something went wrong' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache' },
  });
}