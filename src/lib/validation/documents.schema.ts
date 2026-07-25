import { z } from 'zod';

export const documentStatusSchema = z.enum(['uploading', 'processing', 'embedded', 'failed']);

export const createDocumentSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  storagePath: z.string().min(1),
  category: z.string().optional(),
});
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export const documentSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  fileType: z.string(),
  status: documentStatusSchema,
  category: z.string().nullable(),
  version: z.number(),
  uploadedBy: z.string(),
  createdAt: z.string(),
});
export type DocumentRecord = z.infer<typeof documentSchema>;
