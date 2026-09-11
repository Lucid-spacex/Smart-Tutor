import { z } from 'zod';

export const createProgressReportSchema = z.object({
  enrollmentId: z.string().uuid('Invalid enrollment ID'),
  period: z.string().min(1, 'Period is required').max(100, 'Period must be less than 100 characters'),
  summary: z.string().min(1, 'Summary is required').max(2000, 'Summary must be less than 2000 characters'),
  strengths: z.string().min(1, 'Strengths are required').max(2000, 'Strengths must be less than 2000 characters'),
  areasToImprove: z.string().min(1, 'Areas to improve are required').max(2000, 'Areas to improve must be less than 2000 characters'),
});

export const getProgressReportsQuerySchema = z.object({
  enrollmentId: z.string().uuid('Invalid enrollment ID').optional(),
});

export type CreateProgressReportInput = z.infer<typeof createProgressReportSchema>;
export type GetProgressReportsQuery = z.infer<typeof getProgressReportsQuerySchema>;
