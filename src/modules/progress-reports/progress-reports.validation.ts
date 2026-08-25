import { z } from 'zod';

export const createProgressReportSchema = z.object({
  enrollmentId: z.string().uuid('Invalid enrollment ID'),
  period: z.string().min(1, 'Period is required'),
  summary: z.string().min(1, 'Summary is required'),
  strengths: z.string().min(1, 'Strengths are required'),
  areasToImprove: z.string().min(1, 'Areas to improve are required'),
});

export const getProgressReportsQuerySchema = z.object({
  enrollmentId: z.string().uuid('Invalid enrollment ID').optional(),
});

export type CreateProgressReportInput = z.infer<typeof createProgressReportSchema>;
export type GetProgressReportsQuery = z.infer<typeof getProgressReportsQuerySchema>;
