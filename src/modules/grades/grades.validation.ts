import { z } from 'zod';

export const createGradeSchema = z.object({
  enrollmentId: z.string().uuid('Invalid enrollment ID'),
  assignmentId: z.string().uuid('Invalid assignment ID').optional(),
  score: z.number().min(0, 'Score must be non-negative').max(100, 'Score must not exceed 100'),
  comments: z.string().optional(),
});

export const approveGradeSchema = z.object({});

export const rejectGradeSchema = z.object({
  reason: z.string().optional(),
});

export const getGradesQuerySchema = z.object({
  studentId: z.string().uuid('Invalid student ID').optional(),
  enrollmentId: z.string().uuid('Invalid enrollment ID').optional(),
});

export type CreateGradeInput = z.infer<typeof createGradeSchema>;
export type ApproveGradeInput = z.infer<typeof approveGradeSchema>;
export type RejectGradeInput = z.infer<typeof rejectGradeSchema>;
export type GetGradesQuery = z.infer<typeof getGradesQuerySchema>;