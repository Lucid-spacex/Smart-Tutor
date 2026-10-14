import { z } from 'zod';

export const updateTutorVettingSchema = z.object({
  vettingStatus: z.enum(['APPROVED', 'REJECTED']),
});

export const assignTutorSchema = z.object({
  tutorId: z.string().uuid('Invalid tutor ID'),
  force: z.boolean().optional(),
});

export const updateEnrollmentPricingSchema = z.object({
  yearlyPrice: z.number().positive('Yearly price must be positive').optional(),
  billingFrequency: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
});

export const updatePricingTierSchema = z.object({
  yearlyPriceNGN: z.number().positive('NGN price must be positive').optional(),
  yearlyPriceUSD: z.number().positive('USD price must be positive').optional(),
});

export const updateEnrollmentPricingOverrideSchema = z.object({
  yearlyPriceNGN: z.number().positive('NGN price must be positive').nullable().optional(),
  yearlyPriceUSD: z.number().positive('USD price must be positive').nullable().optional(),
  billingFrequency: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
  note: z.string().optional(),
});

export const createSessionSchema = z.object({
  tutorId: z.string().uuid('Invalid tutor ID'),
  scheduledAt: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid scheduled date'),
  durationMinutes: z.number().int().positive('Duration must be positive'),
  zoomLink: z.string().url('Invalid zoom link').optional(),
  zoomMeetingId: z.string().optional(),
  participantEnrollmentIds: z.array(z.string().uuid('Invalid enrollment ID')).min(1, 'At least one participant required'),
  sharedSessionConfirmed: z.boolean().optional(),
});

export const rescheduleSessionSchema = z.object({
  scheduledAt: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid scheduled date').optional(),
  zoomLink: z.string().url('Invalid zoom link').optional(),
});

export const getTutorsQuerySchema = z.object({
  status: z.enum(['APPROVED', 'PENDING_VETTING', 'REJECTED', 'SUSPENDED']).optional(),
  vettingStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  availabilityStatus: z.enum(['AVAILABLE', 'LIMITED', 'UNAVAILABLE']).optional(),
  subjectId: z.string().uuid().optional(),
  hasCapacity: z.coerce.boolean().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const getStudentsQuerySchema = z.object({
  parentId: z.string().uuid('Invalid parent ID').optional(),
  search: z.string().optional(),
  status: z.enum(['UNVERIFIED', 'ACTIVE', 'PENDING_VETTING', 'APPROVED', 'REJECTED', 'SUSPENDED']).optional(),
  gradeBandTier: z.enum(['PRESCHOOL_TO_G1', 'G2_TO_G4', 'G5_TO_G8', 'G9_TO_G12']).optional(),
  enrolled: z.coerce.boolean().optional(),
  assigned: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const createSubjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required'),
  description: z.string().optional(),
  category: z.enum(['CORE', 'ENRICHMENT', 'TEST_PREP']),
  prices: z.array(z.object({
    gradeBandTier: z.enum(['PRESCHOOL_TO_G1', 'G2_TO_G4', 'G5_TO_G8', 'G9_TO_G12']),
    yearlyPriceNGN: z.number().positive('NGN price must be positive'),
    yearlyPriceUSD: z.number().positive('USD price must be positive'),
  })).min(1, 'At least one grade band price is required'),
});

export const updateSubjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required').optional(),
  description: z.string().optional(),
  category: z.enum(['CORE', 'ENRICHMENT', 'TEST_PREP']).optional(),
  isActive: z.boolean().optional(),
});

export const upsertSubjectPriceSchema = z.object({
  yearlyPriceNGN: z.number().positive('NGN price must be positive'),
  yearlyPriceUSD: z.number().positive('USD price must be positive'),
  isActive: z.boolean().optional(),
  note: z.string().optional(),
});

export const getUnmatchedEnrollmentsQuerySchema = z.object({
  includeUnpaid: z.coerce.boolean().optional(),
});

export const suspendUserSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
});

export const addPaymentNoteSchema = z.object({
  note: z.string().min(1, 'Note is required'),
});

export type UpdateTutorVettingInput = z.infer<typeof updateTutorVettingSchema>;
export type AssignTutorInput = z.infer<typeof assignTutorSchema>;
export type UpdateEnrollmentPricingInput = z.infer<typeof updateEnrollmentPricingSchema>;
export type UpdatePricingTierInput = z.infer<typeof updatePricingTierSchema>;
export type UpdateEnrollmentPricingOverrideInput = z.infer<typeof updateEnrollmentPricingOverrideSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type RescheduleSessionInput = z.infer<typeof rescheduleSessionSchema>;
export type GetTutorsQuery = z.infer<typeof getTutorsQuerySchema>;
export type GetStudentsQuery = z.infer<typeof getStudentsQuerySchema>;
export type GetUnmatchedEnrollmentsQuery = z.infer<typeof getUnmatchedEnrollmentsQuerySchema>;
export type SuspendUserInput = z.infer<typeof suspendUserSchema>;
export type AddPaymentNoteInput = z.infer<typeof addPaymentNoteSchema>;
