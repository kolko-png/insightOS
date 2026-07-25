import { getConversationMessages } from '@/features/copilot/server/queries';
import { ChatWindow } from '@/features/copilot/components/chat-window';

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const messages = await getConversationMessages(conversationId);

  return <ChatWindow conversationId={conversationId} initialMessages={messages} />;
}
