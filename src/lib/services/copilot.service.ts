import 'server-only';
import { cortexComplete, cortexCompleteStream, cortexSearch } from '@/lib/snowflake/cortex';
import { generateSql, UnsafeSqlError } from './nl-to-sql.service';
import { queryAsWorkspace } from '@/lib/snowflake/client';
import { createClient } from '@/lib/supabase/server';
import type { Citation, ReasoningTrace } from '@/lib/validation/copilot.schema';

type Intent = 'data_query' | 'document_qa' | 'general';
type HistoryMessage = { role: 'user' | 'assistant'; content: string };

/**
 * Cheap, fast classification call before committing to a retrieval
 * strategy. This is a real Cortex call (not a keyword heuristic)
 * because "why did revenue drop" vs "what does our refund policy
 * say" needs semantic understanding, not pattern matching — but
 * it's deliberately a small, non-streamed call so it doesn't add
 * visible latency before the user sees the first token of the
 * actual answer.
 */
async function classifyIntent(message: string): Promise<Intent> {
  const raw = await cortexComplete([
    {
      role: 'system',
      content:
        'Classify the user message into exactly one word: DATA_QUERY (asks about specific business ' +
        'metrics/numbers stored in a database — revenue, orders, inventory, invoices, customers, suppliers), ' +
        'DOCUMENT_QA (asks about the content of uploaded documents/files/contracts/policies), or GENERAL ' +
        '(greeting, meta question about the assistant, anything else). Respond with only that one word.',
    },
    { role: 'user', content: message },
  ]);
  const normalized = raw.trim().toUpperCase();
  if (normalized.includes('DATA_QUERY')) return 'data_query';
  if (normalized.includes('DOCUMENT_QA')) return 'document_qa';
  return 'general';
}

export type ChatStreamEvent =
  | { type: 'token'; value: string }
  | { type: 'reasoning'; step: string; detail: string }
  | { type: 'done'; fullText: string; citations: Citation[]; reasoning: ReasoningTrace };

/**
 * The core orchestration loop. Yields events as they happen so the
 * route handler can forward them to the client immediately —
 * reasoning steps (e.g. "generated this SQL") give the UI something
 * meaningful to show during the retrieval phase, before the model
 * starts producing the final answer's tokens.
 */
export async function* streamChatResponse(params: {
  workspaceRole: string;
  workspaceKey: string;
  userMessage: string;
  history: HistoryMessage[];
}): AsyncGenerator<ChatStreamEvent> {
  const { workspaceRole, workspaceKey, userMessage, history } = params;
  const citations: Citation[] = [];
  const reasoning: ReasoningTrace = { intent: 'general', steps: [] };

  const intent = await classifyIntent(userMessage);
  reasoning.intent = intent;

  let contextBlock = '';

  if (intent === 'data_query') {
    yield { type: 'reasoning', step: 'generate_sql', detail: 'Translating question into SQL' };
    try {
      const sql = await generateSql(userMessage);
      reasoning.steps.push({ name: 'generated_sql', detail: sql });
      yield { type: 'reasoning', step: 'execute_sql', detail: sql };

      const rows = await queryAsWorkspace(workspaceRole, sql);
      reasoning.steps.push({ name: 'row_count', detail: String(rows.length) });

      contextBlock = `Query executed against live business data:\n${sql}\n\nResults (JSON):\n${JSON.stringify(
        rows
      ).slice(0, 4000)}`;
      citations.push({ source: 'Snowflake · ANALYTICS', label: 'Live query result', type: 'query' });
    } catch (err) {
      if (err instanceof UnsafeSqlError) {
        reasoning.steps.push({ name: 'sql_rejected', detail: err.message });
        contextBlock =
          `The generated query was rejected by the safety validator: "${err.message}". ` +
          `Explain to the user, in one or two sentences, that you couldn't safely answer this ` +
          `from the available data, and suggest how they might rephrase.`;
      } else {
        throw err;
      }
    }
  } else if (intent === 'document_qa') {
    yield { type: 'reasoning', step: 'search_documents', detail: 'Searching uploaded documents' };
    const results = await cortexSearch(userMessage, workspaceKey, 5);
    reasoning.steps.push({ name: 'chunks_retrieved', detail: String(results.length) });

    contextBlock = results
      .map((r, i) => `[Source ${i + 1} — document ${r.documentId}]\n${r.content}`)
      .join('\n\n');

    results.forEach((r, i) => {
      citations.push({
        source: r.documentId,
        label: `Source ${i + 1}`,
        type: 'document',
        chunkId: r.chunkId,
      });
    });
  }

  const systemPrompt = [
    'You are InsightOS, an AI business copilot embedded in an executive dashboard. Answer clearly ' +
      'and concisely, the way a sharp analyst would brief a CEO — lead with the answer, then the ' +
      'supporting detail.',
    'Explain your reasoning briefly whenever the answer involves numbers. Never invent figures that ' +
      "aren't present in the provided context — if the context doesn't contain what's needed, say so " +
      'explicitly rather than guessing.',
    contextBlock
      ? `\nContext:\n${contextBlock}`
      : "\nNo additional context was retrieved for this question — answer from the conversation " +
        "history and general knowledge, and note if the question needed company data you don't have.",
  ].join('\n');

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...history.slice(-10),
    { role: 'user' as const, content: userMessage },
  ];

  let fullText = '';
  for await (const token of cortexCompleteStream(messages)) {
    fullText += token;
    yield { type: 'token', value: token };
  }

  yield { type: 'done', fullText, citations, reasoning };
}

export async function persistUserMessage(conversationId: string, content: string) {
  const supabase = await createClient();
  await supabase.from('messages').insert({ conversation_id: conversationId, role: 'user', content });
}

export async function persistAssistantMessage(params: {
  conversationId: string;
  fullText: string;
  citations: Citation[];
  reasoning: ReasoningTrace;
}) {
  const supabase = await createClient();
  await supabase.from('messages').insert({
    conversation_id: params.conversationId,
    role: 'assistant',
    content: params.fullText,
    citations: params.citations,
    reasoning: params.reasoning,
  });
  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', params.conversationId);
}
