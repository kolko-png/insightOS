import { NextResponse, type NextRequest } from 'next/server';
import { after } from 'next/server';
import { createDocumentSchema } from '@/lib/validation/documents.schema';
import { createDocument, listDocuments } from '@/lib/services/documents.service';
import { processDocument } from '@/lib/services/document-processing.service';
import { firstIssueMessage } from '@/lib/utils/zod-error';

// Snowflake PUT (writes to a local temp file) and the SDK connection
// pool both need the Node runtime.
export const runtime = 'nodejs';

export async function GET() {
  try {
    const documents = await listDocuments();
    return NextResponse.json(documents);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to list documents' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssueMessage(parsed.error) }, { status: 400 });
  }

  try {
    const document = await createDocument(parsed.data);

    // Scheduled to run after the response is sent — the client gets
    // an immediate "processing" status back instead of waiting on
    // staging + parsing + embedding, which for a multi-page PDF can
    // take several seconds. `after()` keeps the function instance
    // alive for this work without holding the HTTP response open.
    after(() =>
      processDocument(document.id).catch((err) => {
        console.error(`[documents route] processing failed for ${document.id}`, err);
      })
    );

    return NextResponse.json(document, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create document' },
      { status: 500 }
    );
  }
}
