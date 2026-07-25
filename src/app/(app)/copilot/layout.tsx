import type { ReactNode } from 'react';
import { ConversationSidebar } from '@/features/copilot/components/conversation-sidebar';

export default function CopilotLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[calc(100vh-56px)]">
      <ConversationSidebar />
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
