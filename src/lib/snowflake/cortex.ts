import 'server-only';
import { getCortexAuthHeaders } from './auth';

// PHASE 8: endpoint path /api/v2/cortex/inference:complete and the
// streaming SSE response shape were verified against current
// Snowflake docs and multiple working code samples — confirmed
// correct as originally written. llama3.1-70b is a real, documented
// COMPLETE/inference model; if it's unavailable in your account's
// region, `SHOW MODELS IN SNOWFLAKE.CORTEX` or the Cortex docs list
// what's enabled, and cross-region inference can unlock others.
const CORTEX_MODEL = process.env.SNOWFLAKE_CORTEX_MODEL ?? 'llama3.1-70b';

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

/**
 * Streams tokens from Cortex's LLM Inference REST API. We use the
 * REST endpoint rather than calling SNOWFLAKE.CORTEX.COMPLETE() as a
 * SQL function (which nl-to-sql.service.ts effectively does via
 * cortexComplete() below) because the SQL function blocks until the
 * full completion is ready — correct for "generate one SQL string,"
 * wrong for a ChatGPT-style token-by-token chat UI.
 *
 * VERIFY BEFORE PRODUCTION: endpoint path and SSE payload shape
 * against current Snowflake Cortex REST API docs. This is the
 * integration point most likely to need adjustment in Phase 8 —
 * flagging now rather than presenting it as certain.
 */
export async function* cortexCompleteStream(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number } = {}
): AsyncGenerator<string> {
  const account = process.env.SNOWFLAKE_ACCOUNT!;
  const res = await fetch(
    `https://${account}.snowflakecomputing.com/api/v2/cortex/inference:complete`,
    {
      method: 'POST',
      headers: {
        ...getCortexAuthHeaders(),
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        model: CORTEX_MODEL,
        messages,
        temperature: opts.temperature ?? 0.2,
        max_tokens: opts.maxTokens ?? 1024,
        stream: true,
      }),
    }
  );

  if (!res.ok || !res.body) {
    throw new Error(`Cortex completion request failed: ${res.status} ${await res.text()}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') return;
      try {
        const parsed = JSON.parse(payload);
        const token = parsed?.choices?.[0]?.delta?.content;
        if (token) yield token as string;
      } catch {
        // partial/keepalive line — skip, next chunk will complete it
      }
    }
  }
}

/**
 * Non-streaming completion for cases where we need the whole answer
 * before acting on it — NL->SQL generation and intent
 * classification can't act on a half-generated SQL string.
 */
export async function cortexComplete(
  messages: ChatMessage[],
  opts: { temperature?: number } = {}
): Promise<string> {
  let full = '';
  for await (const token of cortexCompleteStream(messages, { ...opts, maxTokens: 512 })) {
    full += token;
  }
  return full;
}

export type CortexSearchResult = {
  chunkId: string;
  documentId: string;
  content: string;
  metadata: Record<string, unknown>;
};

/**
 * Queries the Cortex Search service defined in
 * snowflake/ddl/01_analytics_schema.sql.
 *
 * PHASE 8: endpoint path (/api/v2/databases/{db}/schemas/{schema}/
 * cortex-search-services/{service}:query) and the {"@eq": {...}}
 * filter operator syntax were verified against current Snowflake
 * docs — confirmed correct as originally written, no changes needed.
 *
 * IMPORTANT — this `filter` is not defense-in-depth, it's the ONLY
 * tenant boundary here. Unlike queryAsWorkspace() (Phase 5), which
 * relies on the WORKSPACE_ISOLATION row access policy enforced via
 * CURRENT_ROLE(), the Cortex Search service indexes DOCUMENT_CHUNKS
 * under its own defining role/service context, not per-query caller
 * roles — the row access policy on the base table does not carry
 * through to search results. Every call to this function MUST pass
 * workspaceKey, and it must be sourced from the authenticated user's
 * resolved workspace context, never from client input.
 */
export async function cortexSearch(
  query: string,
  workspaceKey: string,
  limit = 5
): Promise<CortexSearchResult[]> {
  const account = process.env.SNOWFLAKE_ACCOUNT!;
  const res = await fetch(
    `https://${account}.snowflakecomputing.com/api/v2/databases/INSIGHTOS_DB/schemas/AI/cortex-search-services/INSIGHTOS_DOCUMENT_SEARCH:query`,
    {
      method: 'POST',
      headers: {
        ...getCortexAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        columns: ['chunk_id', 'document_id', 'content', 'metadata'],
        filter: { '@eq': { workspace_key: workspaceKey } },
        limit,
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Cortex Search request failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return (data.results ?? []).map((r: Record<string, string>) => ({
    chunkId: r.chunk_id,
    documentId: r.document_id,
    content: r.content,
    metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : (r.metadata ?? {}),
  }));
}
