import { NextResponse } from 'next/server';
import { getCategoryBreakdown } from '@/features/analytics/server/queries';

export async function GET() {
  try {
    const data = await getCategoryBreakdown();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load category breakdown' },
      { status: 500 }
    );
  }
}
