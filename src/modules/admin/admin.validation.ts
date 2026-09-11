import { z } from 'zod';

export const updateTutorVettingSchema = z.object({
  vettingStatus: z.enum(['APPROVED', 'REJECTED']),
});

export const assignTutorSchema = z.object({
  tutorId: z.string().uuid('Invalid tutor ID'),
});

export const updateEnrollmentPricingSchema = z.object({
  yearlyPrice: z.number().positive('Yearly price must be positive').optional(),
  billingFrequency: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
});

export const createSessionSchema = z.object({
  tutorId: z.string().uuid('Invalid tutor ID'),
  scheduledAt: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid scheduled date'),
  durationMinutes: z.number().int().positive('Duration must be positive'),
  zoomLink: z.string().url('Invalid zoom link').optional(),
  participantEnrollmentIds: z.array(z.string().uuid('Invalid enrollment ID')).min(1, 'At least one participant required'),
  sharedSessionConfirmed: z.boolean().optional(),
});

export const rescheduleSessionSchema = z.object({
  scheduledAt: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid scheduled date').optional(),
  zoomLink: z.string().url('Invalid zoom link').optional(),
});

export const getTutorsQuerySchema = z.object({
  status: z.enum(['APPROVED', 'PENDING_VETTING', 'REJECTED', 'SUSPENDED']).optional(),
});

export const getStudentsQuerySchema = z.object({
  parentId: z.string().uuid('Invalid parent ID').optional(),
});

export type UpdateTutorVettingInput = z.infer<typeof updateTutorVettingSchema>;
export type AssignTutorInput = z.infer<typeof assignTutorSchema>;
export type UpdateEnrollmentPricingInput = z.infer<typeof updateEnrollmentPricingSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type RescheduleSessionInput = z.infer<typeof rescheduleSessionSchema>;
export type GetTutorsQuery = z.infer<typeof getTutorsQuerySchema>;
export type GetStudentsQuery = z.infer<typeof getStudentsQuerySchema>;
