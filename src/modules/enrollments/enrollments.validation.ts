import { z } from 'zod';

export const createEnrollmentSchema = z.object({
  studentId: z.string().uuid('Invalid student ID'),
  subjectId: z.string().uuid('Invalid subject ID'),
  sessionFrequency: z.enum(['WEEKLY', 'BI_WEEKLY', 'MONTHLY']),
  billingFrequency: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']).default('YEARLY'),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid start date'),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid end date').optional(),
});

export const getEnrollmentsQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']).optional(),
});

export const updateEnrollmentPricingSchema = z.object({
  yearlyPrice: z.number().positive('Yearly price must be positive').optional(),
  billingFrequency: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
});

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;
export type GetEnrollmentsQuery = z.infer<typeof getEnrollmentsQuerySchema>;
export type UpdateEnrollmentPricingInput = z.infer<typeof updateEnrollmentPricingSchema>;
