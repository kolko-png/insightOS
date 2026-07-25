'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Message } from '@/lib/validation/copilot.schema';

type UiMessage = Message & { isStreaming?: boolean };

export function useChatStream(conversationId: string | undefined, initialMessages: Message[]) {
  const [messages, setMessages] = useState<UiMessage[]>(initialMessages);
  const [isStreaming, setIsStreaming] = useState(false);
  const [reasoningLog, setReasoningLog] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const router = useRouter();

  const send = useCallback(
    async (text: string) => {
      const userMsg: UiMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        citations: [],
        createdAt: new Date().toISOString(),
      };
      const assistantId = crypto.randomUUID();
      const assistantMsg: UiMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        citations: [],
        createdAt: new Date().toISOString(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);
      setReasoningLog([]);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch('/api/copilot/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId, message: text }),
          signal: controller.signal,
        });

        if (!res.body) throw new Error('No response stream');
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line);

            switch (event.type) {
              case 'conversation':
                // A brand-new chat gets its conversation id here — sync
                // the URL so refresh/back-nav lands on this conversation
                // instead of silently starting a fresh one each time.
                if (!conversationId) router.replace(`/copilot/${event.id}`);
                break;
              case 'token':
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: m.content + event.value } : m
                  )
                );
                break;
              case 'reasoning':
                setReasoningLog((prev) => [...prev, `${event.step}: ${event.detail}`]);
                break;
              case 'done':
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          content: event.fullText,
                          citations: event.citations,
                          reasoning: event.reasoning,
                          isStreaming: false,
                        }
                      : m
                  )
                );
                break;
              case 'error':
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: `⚠️ ${event.message}`, isStreaming: false }
                      : m
                  )
                );
                break;
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: '⚠️ Failed to get a response. Please try again.', isStreaming: false }
                : m
            )
          );
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [conversationId, router]
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const regenerate = useCallback(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    const cutIndex = messages.findIndex((m) => m.id === lastUser.id) + 1;
    setMessages((prev) => prev.slice(0, cutIndex));
    send(lastUser.content);
  }, [messages, send]);

  return { messages, send, stop, regenerate, isStreaming, reasoningLog };
}
