'use client';

import { useRef, type KeyboardEvent } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ChatInput({
  onSend,
  onStop,
  isStreaming,
}: {
  onSend: (text: string) => void;
  onStop: () => void;
  isStreaming: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const value = ref.current?.value.trim();
    if (!value || isStreaming) return;
    onSend(value);
    if (ref.current) {
      ref.current.value = '';
      ref.current.style.height = 'auto';
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const onInput = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  return (
    <div className="flex items-end gap-2 rounded-2xl border border-border/60 bg-card p-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <textarea
        ref={ref}
        rows={1}
        placeholder="Ask InsightOS about your business…"
        onKeyDown={onKeyDown}
        onInput={onInput}
        className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-[13.5px] outline-none placeholder:text-muted-foreground"
      />
      {isStreaming ? (
        <Button size="icon" variant="secondary" onClick={onStop} aria-label="Stop generating">
          <Square className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <Button size="icon" onClick={submit} aria-label="Send message">
          <ArrowUp className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
