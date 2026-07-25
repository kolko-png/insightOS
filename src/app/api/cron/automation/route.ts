import { NextResponse, type NextRequest } from 'next/server';
import { evaluateThresholdWorkflows, evaluateScheduleWorkflows } from '@/lib/services/automation-engine.service';


export const runtime = 'nodejs';
export const maxDuration = 60;


export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  await Promise.all([evaluateThresholdWorkflows(), evaluateScheduleWorkflows()]);

  return NextResponse.json({ ok: true, durationMs: Date.now() - startedAt });
}
