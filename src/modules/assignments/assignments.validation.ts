import { z } from 'zod';

export const createAssignmentSchema = z.object({
  enrollmentId: z.string().uuid('Invalid enrollment ID'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().optional(),
  type: z.enum(['ASSIGNMENT', 'CLASSWORK', 'TEST', 'HOMEWORK', 'PROJECT', 'QUIZ']),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid due date'),
  attachmentUrl: z.string().url('Invalid attachment URL').optional(),
  attachmentName: z.string().optional(),
});

export const updateAssignmentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters').optional(),
  description: z.string().optional(),
  type: z.enum(['ASSIGNMENT', 'CLASSWORK', 'TEST', 'HOMEWORK', 'PROJECT', 'QUIZ']).optional(),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid due date').optional(),
  attachmentUrl: z.string().url('Invalid attachment URL').optional(),
  attachmentName: z.string().optional(),
});

export const updateAssignmentStatusSchema = z.object({
  status: z.enum(['PENDING', 'COMPLETED', 'SUBMITTED', 'GRADED', 'CANCELLED']),
});

export const submitAssignmentSchema = z.object({
  textAnswer: z.string().optional(),
  attachmentUrl: z.string().url('Invalid attachment URL').optional(),
  attachmentName: z.string().optional(),
});

export const provideFeedbackSchema = z.object({
  feedbackText: z.string().optional(),
  feedbackAttachmentUrl: z.string().url('Invalid feedback attachment URL').optional(),
  feedbackAttachmentName: z.string().optional(),
});

export const getAssignmentsQuerySchema = z.object({
  enrollmentId: z.string().uuid('Invalid enrollment ID').optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'SUBMITTED', 'GRADED', 'CANCELLED']).optional(),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;
export type UpdateAssignmentStatusInput = z.infer<typeof updateAssignmentStatusSchema>;
export type SubmitAssignmentInput = z.infer<typeof submitAssignmentSchema>;
export type ProvideFeedbackInput = z.infer<typeof provideFeedbackSchema>;
export type GetAssignmentsQuery = z.infer<typeof getAssignmentsQuerySchema>;