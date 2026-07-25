import { NextResponse, type NextRequest } from 'next/server';
import { getTrend } from '@/features/analytics/server/queries';

export async function GET(req: NextRequest) {
  const requested = Number(req.nextUrl.searchParams.get('months') ?? '12');
  const months = Number.isFinite(requested) ? Math.min(Math.max(requested, 3), 24) : 12;

  try {
    const trend = await getTrend(months);
    return NextResponse.json(trend);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load trend' },
      { status: 500 }
    );
  }
}
