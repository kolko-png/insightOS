import { NextResponse } from 'next/server';
import { getDashboardKpis } from '@/features/dashboard/server/queries';


export async function GET() {
  try {
    const kpis = await getDashboardKpis();
    return NextResponse.json(kpis);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load KPIs' },
      { status: 500 }
    );
  }
}
