import { z } from 'zod';

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid().optional(), // absent = create a new conversation
  message: z.string().min(1, 'Message cannot be empty').max(4000, 'Message is too long'),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const citationSchema = z.object({
  source: z.string(),
  label: z.string(),
  type: z.enum(['query', 'document']),
  chunkId: z.string().optional(),
});
export type Citation = z.infer<typeof citationSchema>;

export const reasoningStepSchema = z.object({ name: z.string(), detail: z.string() });
export const reasoningTraceSchema = z.object({
  intent: z.enum(['data_query', 'document_qa', 'general']),
  steps: z.array(reasoningStepSchema),
});
export type ReasoningTrace = z.infer<typeof reasoningTraceSchema>;

export const messageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  citations: z.array(citationSchema).default([]),
  reasoning: reasoningTraceSchema.nullable().optional(),
  createdAt: z.string(),
});
export type Message = z.infer<typeof messageSchema>;

export const conversationSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  updatedAt: z.string(),
});
export type ConversationSummary = z.infer<typeof conversationSummarySchema>;
