import { z } from 'zod';

export const updateTutorVettingSchema = z.object({
  vettingStatus: z.enum(['APPROVED', 'REJECTED']),
});

export const assignTutorSchema = z.object({
  tutorId: z.string().uuid('Invalid tutor ID'),
});

export const getTutorsQuerySchema = z.object({
  status: z.enum(['APPROVED', 'PENDING_VETTING', 'REJECTED', 'SUSPENDED']).optional(),
});

export const getStudentsQuerySchema = z.object({
  parentId: z.string().uuid('Invalid parent ID').optional(),
});

export type UpdateTutorVettingInput = z.infer<typeof updateTutorVettingSchema>;
export type AssignTutorInput = z.infer<typeof assignTutorSchema>;
export type GetTutorsQuery = z.infer<typeof getTutorsQuerySchema>;
export type GetStudentsQuery = z.infer<typeof getStudentsQuerySchema>;
