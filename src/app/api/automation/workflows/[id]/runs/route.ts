import { NextResponse } from 'next/server';
import { getWorkflowRuns } from '@/lib/services/automation.service';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const runs = await getWorkflowRuns(id);
    return NextResponse.json(runs);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load run history' },
      { status: 500 }
    );
  }
}
