import { z } from 'zod';

export const createAssignmentSchema = z.object({
  enrollmentId: z.string().uuid('Invalid enrollment ID'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().optional(),
  type: z.enum(['ASSIGNMENT', 'CLASSWORK', 'TEST']),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid due date'),
});

export const updateAssignmentSchema = z.object({
  status: z.enum(['PENDING', 'COMPLETED']),
});

export const getAssignmentsQuerySchema = z.object({
  enrollmentId: z.string().uuid('Invalid enrollment ID').optional(),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;
export type GetAssignmentsQuery = z.infer<typeof getAssignmentsQuerySchema>;