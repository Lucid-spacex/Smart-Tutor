import { z } from 'zod';

export const createGradeSchema = z.object({
  enrollmentId: z.string().uuid('Invalid enrollment ID'),
  periodStart: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid period start date'),
  periodEnd: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid period end date'),
  components: z.array(z.object({
    type: z.string(),
    weight: z.number().min(0).max(100),
    scoredItemId: z.string().uuid().optional(),
    attendanceRate: z.number().min(0).max(100).optional(),
  })).min(1, 'At least one component is required'),
  tutorComment: z.string().optional(),
}).refine((data) => {
  const totalWeight = data.components.reduce((sum, c) => sum + c.weight, 0);
  return Math.abs(totalWeight - 100) < 0.01;
}, {
  message: 'Component weights must total exactly 100',
  path: ['components'],
});

export const updateGradeSchema = z.object({
  periodStart: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid period start date').optional(),
  periodEnd: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid period end date').optional(),
  components: z.array(z.object({
    type: z.string(),
    weight: z.number().min(0).max(100),
    scoredItemId: z.string().uuid().optional(),
    attendanceRate: z.number().min(0).max(100).optional(),
  })).optional(),
  tutorComment: z.string().optional(),
  finalScore: z.number().min(0).max(100).optional(),
  overrideReason: z.string().min(10, 'Override reason must be at least 10 characters').optional(),
}).refine((data) => {
  if (data.components) {
    const totalWeight = data.components.reduce((sum, c) => sum + c.weight, 0);
    return Math.abs(totalWeight - 100) < 0.01;
  }
  return true;
}, {
  message: 'Component weights must total exactly 100',
  path: ['components'],
}).refine((data) => {
  if (data.finalScore !== undefined && data.overrideReason === undefined) {
    return false;
  }
  return true;
}, {
  message: 'Override reason is required when setting finalScore',
  path: ['overrideReason'],
});

export const approveGradeSchema = z.object({});

export const rejectGradeSchema = z.object({
  reason: z.string().min(10, 'Rejection reason must be at least 10 characters'),
});

export const getGradesQuerySchema = z.object({
  status: z.string().optional(),
  tutorId: z.string().uuid('Invalid tutor ID').optional(),
  studentId: z.string().uuid('Invalid student ID').optional(),
  subjectId: z.string().uuid('Invalid subject ID').optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const bulkApproveSchema = z.object({
  gradeIds: z.array(z.string().uuid()).min(1, 'At least one grade ID is required'),
});

export type CreateGradeInput = z.infer<typeof createGradeSchema>;
export type UpdateGradeInput = z.infer<typeof updateGradeSchema>;
export type ApproveGradeInput = z.infer<typeof approveGradeSchema>;
export type RejectGradeInput = z.infer<typeof rejectGradeSchema>;
export type GetGradesQuery = z.infer<typeof getGradesQuerySchema>;
export type BulkApproveInput = z.infer<typeof bulkApproveSchema>;