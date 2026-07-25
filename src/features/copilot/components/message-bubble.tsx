'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from 'next-themes';
import { Copy, RefreshCw, ThumbsDown, ThumbsUp, Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { Message } from '@/lib/validation/copilot.schema';
import { CitationPanel } from './citation-panel';
import { TypingIndicator } from './typing-indicator';

export function MessageBubble({
  message,
  onRegenerate,
  isLast,
}: {
  message: Message & { isStreaming?: boolean };
  onRegenerate?: () => void;
  isLast?: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const copy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (message.isStreaming && !message.content) {
    return (
      <div className="flex gap-3 px-4 py-3">
        <Avatar isUser={false} />
        <TypingIndicator />
      </div>
    );
  }

  return (
    <div className={cn('flex gap-3 px-4 py-3', isUser && 'flex-row-reverse')}>
      <Avatar isUser={isUser} />
      <div className={cn('flex max-w-[75%] flex-col gap-2', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed',
            isUser ? 'bg-foreground text-background' : 'border border-border/60 bg-card'
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none prose-p:my-2 prose-pre:my-2 dark:prose-invert">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return match ? (
                      <SyntaxHighlighter
                        style={resolvedTheme === 'dark' ? oneDark : oneLight}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{ borderRadius: 8, fontSize: 12.5, margin: 0 }}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className="rounded bg-muted px-1 py-0.5 text-[12.5px]" {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {!isUser && message.citations.length > 0 && <CitationPanel citations={message.citations} />}

        {!isUser && !message.isStreaming && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <button onClick={copy} className="rounded p-1 hover:bg-accent" aria-label="Copy response">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <button className="rounded p-1 hover:bg-accent" aria-label="Good response">
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button className="rounded p-1 hover:bg-accent" aria-label="Bad response">
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
            {isLast && onRegenerate && (
              <button
                onClick={onRegenerate}
                className="rounded p-1 hover:bg-accent"
                aria-label="Regenerate response"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Avatar({ isUser }: { isUser: boolean }) {
  return (
    <div
      className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-medium',
        isUser ? 'bg-accent' : 'bg-foreground text-background'
      )}
    >
      {isUser ? 'You' : 'AI'}
    </div>
  );
}
