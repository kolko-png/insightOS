import { NextResponse } from 'next/server';
import { getDocumentVersionsById } from '@/lib/services/documents.service';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const versions = await getDocumentVersionsById(id);
    return NextResponse.json(versions);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load version history' },
      { status: 500 }
    );
  }
}
