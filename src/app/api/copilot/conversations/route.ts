import { NextResponse } from 'next/server';
import { getConversations } from '@/features/copilot/server/queries';

export async function GET() {
  try {
    const conversations = await getConversations();
    return NextResponse.json(conversations);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load conversations' },
      { status: 500 }
    );
  }
}
