import { z } from 'zod';

export const createEnrollmentSchema = z.object({
  studentId: z.string().uuid('Invalid student ID'),
  subjectId: z.string().uuid('Invalid subject ID'),
  frequency: z.enum(['WEEKLY', 'BI_WEEKLY', 'MONTHLY']),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid start date'),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid end date').optional(),
});

export const getEnrollmentsQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']).optional(),
});

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;
export type GetEnrollmentsQuery = z.infer<typeof getEnrollmentsQuerySchema>;
