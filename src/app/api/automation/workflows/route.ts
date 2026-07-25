import { NextResponse, type NextRequest } from 'next/server';
import { createWorkflowSchema } from '@/lib/validation/automation.schema';
import { createWorkflow, listWorkflows } from '@/lib/services/automation.service';

export async function GET() {
  try {
    const workflows = await listWorkflows();
    return NextResponse.json(workflows);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to list workflows' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createWorkflowSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error?.issues?.[0]?.message ?? 'Invalid request payload' },
      { status: 400 }
    );
  }

  try {
    const workflow = await createWorkflow(parsed.data);
    return NextResponse.json(workflow, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create workflow' },
      { status: 500 }
    );
  }
}
