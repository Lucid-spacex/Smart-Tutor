import { z } from 'zod';

export const createSessionSchema = z.object({
  tutorId: z.string().uuid('Invalid tutor ID'),
  scheduledAt: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid scheduled date'),
  durationMinutes: z.number().int().positive('Duration must be positive'),
  zoomLink: z.string().url('Invalid zoom link').optional(),
  participantEnrollmentIds: z.array(z.string().uuid('Invalid enrollment ID')).min(1, 'At least one participant required'),
  sharedSessionConfirmed: z.boolean().optional(),
});

export const rescheduleSessionSchema = z.object({
  scheduledAt: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid scheduled date').optional(),
  zoomLink: z.string().url('Invalid zoom link').optional(),
});

export const updateSessionSchema = z.object({
  status: z.enum(['COMPLETED', 'MISSED', 'CANCELLED']).optional(),
  tutorNotes: z.string().optional(),
  homeworkAssigned: z.string().optional(),
  participants: z.array(z.object({
    enrollmentId: z.string().uuid('Invalid enrollment ID'),
    attended: z.boolean(),
  })).optional(),
});

export const getSessionsQuerySchema = z.object({
  enrollmentId: z.string().uuid('Invalid enrollment ID').optional(),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'MISSED', 'CANCELLED']).optional(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type RescheduleSessionInput = z.infer<typeof rescheduleSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type GetSessionsQuery = z.infer<typeof getSessionsQuerySchema>;
