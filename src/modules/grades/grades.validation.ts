import { z } from 'zod';

export const createGradeSchema = z.object({
  enrollmentId: z.string().uuid('Invalid enrollment ID'),
  assignmentId: z.string().uuid('Invalid assignment ID').optional(),
  score: z.number().min(0, 'Score must be non-negative'),
  maxScore: z.number().min(1, 'Max score must be at least 1').default(100),
  comments: z.string().optional(),
  attachmentUrl: z.string().url('Invalid attachment URL').optional(),
  attachmentName: z.string().optional(),
}).refine((data) => data.score <= data.maxScore, {
  message: 'Score must not exceed maxScore',
  path: ['score'],
});

export const updateGradeSchema = z.object({
  score: z.number().min(0, 'Score must be non-negative').optional(),
  maxScore: z.number().min(1, 'Max score must be at least 1').optional(),
  comments: z.string().optional(),
  attachmentUrl: z.string().url('Invalid attachment URL').optional(),
  attachmentName: z.string().optional(),
}).refine((data) => {
  if (data.score !== undefined && data.maxScore !== undefined) {
    return data.score <= data.maxScore;
  }
  return true;
}, {
  message: 'Score must not exceed maxScore',
  path: ['score'],
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
export type UpdateGradeInput = z.infer<typeof updateGradeSchema>;
export type ApproveGradeInput = z.infer<typeof approveGradeSchema>;
export type RejectGradeInput = z.infer<typeof rejectGradeSchema>;
export type GetGradesQuery = z.infer<typeof getGradesQuerySchema>;