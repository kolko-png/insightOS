'use client';

import { useEffect, useRef } from 'react';
import { useChatStream } from '../hooks/use-chat-stream';
import { MessageBubble } from './message-bubble';
import { ChatInput } from './chat-input';
import { PromptSuggestions } from './prompt-suggestions';
import type { Message } from '@/lib/validation/copilot.schema';

export function ChatWindow({
  conversationId,
  initialMessages,
}: {
  conversationId?: string;
  initialMessages: Message[];
}) {
  const { messages, send, stop, regenerate, isStreaming } = useChatStream(
    conversationId,
    initialMessages
  );
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center gap-6 px-4">
            <div className="text-center">
              <h2 className="text-[18px] font-semibold tracking-tight">Ask InsightOS anything</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your business data, explained in plain language.
              </p>
            </div>
            <PromptSuggestions onSelect={send} />
          </div>
        ) : (
          <div className="mx-auto max-w-3xl py-4">
            {messages.map((m, i) => (
              <MessageBubble
                key={m.id}
                message={m}
                isLast={i === messages.length - 1}
                onRegenerate={m.role === 'assistant' ? regenerate : undefined}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="mx-auto w-full max-w-3xl px-4 pb-4">
        <ChatInput onSend={send} onStop={stop} isStreaming={isStreaming} />
      </div>
    </div>
  );
}
