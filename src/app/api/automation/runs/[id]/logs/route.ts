import { NextResponse } from 'next/server';
import { getRunLogs } from '@/lib/services/automation.service';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const logs = await getRunLogs(id);
    return NextResponse.json(logs);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load run logs' },
      { status: 500 }
    );
  }
}
