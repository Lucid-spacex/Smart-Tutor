import { z } from 'zod';

export const updateTutorVettingSchema = z.object({
  vettingStatus: z.enum(['APPROVED', 'REJECTED']),
});

export const assignTutorSchema = z.object({
  tutorId: z.string().uuid('Invalid tutor ID'),
});

export type UpdateTutorVettingInput = z.infer<typeof updateTutorVettingSchema>;
export type AssignTutorInput = z.infer<typeof assignTutorSchema>;
