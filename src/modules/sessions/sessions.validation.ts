import { z } from 'zod';

export const updateSessionSchema = z.object({
  status: z.enum(['COMPLETED', 'MISSED', 'CANCELLED']),
  tutorNotes: z.string().optional(),
  homeworkAssigned: z.string().optional(),
});

export const getSessionsQuerySchema = z.object({
  enrollmentId: z.string().uuid('Invalid enrollment ID').optional(),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'MISSED', 'CANCELLED']).optional(),
});

export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type GetSessionsQuery = z.infer<typeof getSessionsQuerySchema>;
