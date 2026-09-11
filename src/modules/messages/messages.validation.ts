import { z } from 'zod';

export const createMessageSchema = z.object({
  recipientId: z.string().uuid('Invalid recipient ID format'),
  body: z.string().min(1, 'Message body cannot be empty').max(2000, 'Message body exceeds 2000 characters limit'),
});

export const threadIdParamSchema = z.object({
  threadId: z.string().uuid('Invalid thread ID format'),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;
