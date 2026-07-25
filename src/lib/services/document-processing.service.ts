import 'server-only';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createAdminClient } from '@/lib/supabase/admin';
import { queryAsWorkspace } from '@/lib/snowflake/client';
import { workspaceRoleName } from '@/lib/snowflake/roles';
import { chunkText } from '@/lib/utils/chunk-text';
import { oneToOne } from '@/lib/utils/supabase-embed';
import { triggerEvent } from './automation-engine.service';

const STORAGE_BUCKET = 'documents';
// PHASE 8: confirmed against current Snowflake docs — e5-base-v2 is
// a valid, supported model for EMBED_TEXT_768. (snowflake-arctic-embed-m
// is a newer alternative Snowflake states outperforms e5-base-v2 on
// retrieval benchmarks at the same parameter count — worth an A/B
// if retrieval quality matters more than this hackathon needs.)
const EMBED_MODEL = 'e5-base-v2';

/**
 * Full ingest pipeline:
 * Supabase Storage -> local temp file -> Snowflake internal stage ->
 * CORTEX.PARSE_DOCUMENT -> chunk (JS) -> CORTEX.EMBED_TEXT_768 per
 * chunk -> DOCUMENT_CHUNKS.
 *
 * Runs decoupled from the uploading user's request/session — uses
 * the admin Supabase client rather than the request-scoped one —
 * because it's invoked via Next.js's `after()` in the route handler
 * (see app/api/documents/route.ts) and needs to keep running after
 * the HTTP response has already gone back to the browser.
 *
 * Uses AI_PARSE_DOCUMENT (extracts text server-side in Snowflake)
 * rather than a Node PDF/DOCX parsing library — deliberately keeps
 * document parsing inside the governed Cortex boundary instead of
 * adding pdf-parse/mammoth as app dependencies.
 *
 * PHASE 8 CORRECTION: two things fixed after verifying against
 * current Snowflake docs. First, the original call used
 * PARSE_DOCUMENT with a bare `@stage` reference as a function
 * argument — stage references only work unquoted in FROM-clause-like
 * contexts, not as scalar arguments; the correct form wraps it in
 * TO_FILE('@stage', 'relative/path'). Second, PARSE_DOCUMENT itself
 * is now the legacy name — AI_PARSE_DOCUMENT is documented as "the
 * updated version... for the latest functionality, use
 * AI_PARSE_DOCUMENT," so this pipeline now calls that instead.
 * Output shape (a "content" field, Markdown in LAYOUT mode, plain
 * text in OCR mode) is unchanged between the two and matches what
 * this function expects.
 */
export async function processDocument(documentId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: doc, error: fetchError } = await admin
    .from('documents')
    .select('id, workspace_id, file_name, file_type, storage_path, workspaces(snowflake_workspace_key)')
    .eq('id', documentId)
    .single();

  if (fetchError || !doc) {
    throw new Error(`Cannot process document ${documentId}: ${fetchError?.message ?? 'not found'}`);
  }

  const workspace = oneToOne(doc.workspaces);
  if (!workspace?.snowflake_workspace_key) {
    throw new Error(`Cannot process document ${documentId}: invalid workspace data`);
  }
  const workspaceKey = workspace.snowflake_workspace_key;
  const role = workspaceRoleName(workspaceKey);

  try {
    // 1. Download the raw bytes from Supabase Storage.
    const { data: fileBlob, error: downloadError } = await admin.storage
      .from(STORAGE_BUCKET)
      .download(doc.storage_path);
    if (downloadError || !fileBlob) {
      throw new Error(`Storage download failed: ${downloadError?.message ?? 'no data'}`);
    }
    const buffer = Buffer.from(await fileBlob.arrayBuffer());

    // 2. Write to a local temp file — Snowflake's PUT command
    // requires a filesystem path, not a buffer. /tmp is the
    // writable, ephemeral scratch space available in Vercel's Node
    // serverless functions (not available on Edge — this is why
    // this whole route is pinned to the Node runtime).
    const tmpPath = path.join(os.tmpdir(), `${documentId}-${doc.file_name}`);
    await fs.writeFile(tmpPath, buffer);

    const stagePath = `${workspaceKey}/${documentId}`;

    try {
      // 3. Stage the file under a workspace-prefixed path within
      // the shared DOCUMENT_STAGE.
      await queryAsWorkspace(
        role,
        `put file://${tmpPath} @INSIGHTOS_DB.AI.DOCUMENT_STAGE/${stagePath} auto_compress=false overwrite=true`
      );

      // 4. Parse the staged file server-side in Snowflake.
      const parseRows = await queryAsWorkspace<{ CONTENT: string }>(
        role,
        `select SNOWFLAKE.CORTEX.AI_PARSE_DOCUMENT(
           TO_FILE('@INSIGHTOS_DB.AI.DOCUMENT_STAGE', ?),
           {'mode': 'LAYOUT'}
         ):content::string as CONTENT`,
        [`${stagePath}/${doc.file_name}`]
      );

      const extractedText = parseRows[0]?.CONTENT ?? '';
      if (!extractedText.trim()) {
        throw new Error('No extractable text found in document');
      }

      // 5. Chunk in JS.
      const chunks = chunkText(extractedText);
      if (chunks.length === 0) {
        throw new Error('Document produced no usable chunks after splitting');
      }

      // 6. Embed + insert each chunk. One statement per chunk
      // rather than a single batched insert — simpler to reason
      // about and to retry individually if one embedding call
      // fails; fine at hackathon document volumes. Worth batching
      // (e.g. a single INSERT ... SELECT over a VALUES table) if
      // ingesting many large documents becomes routine.
      for (const chunk of chunks) {
        await queryAsWorkspace(
          role,
          `insert into INSIGHTOS_DB.AI.DOCUMENT_CHUNKS
             (workspace_key, document_id, chunk_index, content, embedding, metadata)
           select ?, ?, ?, ?, SNOWFLAKE.CORTEX.EMBED_TEXT_768(?, ?), parse_json(?)`,
          [
            workspaceKey,
            documentId,
            chunk.index,
            chunk.content,
            EMBED_MODEL,
            chunk.content,
            JSON.stringify({ fileName: doc.file_name, fileType: doc.file_type }),
          ]
        );
      }

      await admin
        .from('documents')
        .update({ status: 'embedded', snowflake_stage_path: stagePath })
        .eq('id', documentId);

      // The one currently-wired event trigger (see
      // automation-engine.service.ts triggerEvent()) — lets a
      // workflow react to "a document just became searchable"
      // without polling. Failure here shouldn't fail the ingest
      // pipeline that already succeeded, so it's caught and logged
      // rather than thrown.
      await triggerEvent(doc.workspace_id, 'document_processed', {
        documentId,
        fileName: doc.file_name,
      }).catch((err) => {
        console.error(`[document-processing] event trigger failed for ${documentId}`, err);
      });
    } finally {
      await fs.unlink(tmpPath).catch(() => {});
    }
  } catch (err) {
    await admin.from('documents').update({ status: 'failed' }).eq('id', documentId);
    throw err;
  }
}