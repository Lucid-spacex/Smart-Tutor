import { z } from 'zod';

export const createComplaintSchema = z.object({
  aboutType: z.enum(['STUDENT', 'TUTOR', 'PARENT', 'GENERAL']),
  aboutId: z.string().uuid('Invalid ID').optional(),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject must be less than 200 characters'),
  description: z.string().min(1, 'Description is required').max(2000, 'Description must be less than 2000 characters'),
});

export const resolveComplaintSchema = z.object({
  resolution: z.string().min(1, 'Resolution is required').max(2000, 'Resolution must be less than 2000 characters'),
});

export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;
export type ResolveComplaintInput = z.infer<typeof resolveComplaintSchema>;