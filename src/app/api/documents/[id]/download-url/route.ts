import { NextResponse } from 'next/server';
import { getDocumentDownloadUrl } from '@/lib/services/documents.service';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const url = await getDocumentDownloadUrl(id);
    return NextResponse.redirect(url);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate download link' },
      { status: 500 }
    );
  }
}
