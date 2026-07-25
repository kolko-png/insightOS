import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getWorkflow, setWorkflowActive } from '@/lib/services/automation.service';
import { firstIssueMessage } from '@/lib/utils/zod-error';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const workflow = await getWorkflow(id);
    if (!workflow) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(workflow);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load workflow' },
      { status: 500 }
    );
  }
}

const patchSchema = z.object({ isActive: z.boolean() });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssueMessage(parsed.error) }, { status: 400 });
  }

  try {
    await setWorkflowActive(id, parsed.data.isActive);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update workflow' },
      { status: 500 }
    );
  }
}
