import { z } from 'zod';

// Valid day codes for availableDays
const VALID_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

// Required number of availableDays per sessionFrequency
const SESSION_DAY_COUNT: Record<string, number> = {
  TWICE_WEEKLY:      2,
  THRICE_WEEKLY:     3,
  FIVE_TIMES_WEEKLY: 5,
};

export const createEnrollmentSchema = z
  .object({
    studentId: z.string().uuid('Invalid student ID'),

    // 1–4 subject IDs — supports multi-subject batch enrollment in one action.
    // Each subject gets its own Enrollment row; all share one enrollmentGroupId.
    subjectIds: z
      .array(z.string().uuid('Invalid subject ID'))
      .min(1, 'At least one subject is required')
      .max(4, 'Maximum 4 subjects per enrollment batch'),

    sessionFrequency: z.enum(['TWICE_WEEKLY', 'THRICE_WEEKLY', 'FIVE_TIMES_WEEKLY'], {
      errorMap: () => ({
        message: 'sessionFrequency must be TWICE_WEEKLY, THRICE_WEEKLY, or FIVE_TIMES_WEEKLY',
      }),
    }),

    // Subset of the VALID_DAYS above.
    // The count must match sessionFrequency \u2014 enforced by .refine() below.
    availableDays: z
      .array(z.enum(VALID_DAYS, {
        errorMap: () => ({ message: 'Each day must be one of MON TUE WED THU FRI SAT SUN' }),
      }))
      .min(1, 'At least one available day is required')
      .max(7, 'Cannot exceed 7 available days'),

    // Preferred session window in the parent's OWN local timezone (0\u201323).
    // Stored raw \u2014 converted to Africa/Lagos on demand via computeLagosEquivalentWindow().
    preferredStartHour: z
      .number({ required_error: 'preferredStartHour is required' })
      .int('preferredStartHour must be an integer')
      .min(0, 'preferredStartHour must be between 0 and 23')
      .max(23, 'preferredStartHour must be between 0 and 23'),

    preferredEndHour: z
      .number({ required_error: 'preferredEndHour is required' })
      .int('preferredEndHour must be an integer')
      .min(0, 'preferredEndHour must be between 0 and 23')
      .max(23, 'preferredEndHour must be between 0 and 23'),

    billingFrequency: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']).default('YEARLY'),

    startDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), 'Invalid start date'),

    endDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), 'Invalid end date')
      .optional(),
  })
  .refine(
    (data) => {
      const required = SESSION_DAY_COUNT[data.sessionFrequency];
      return data.availableDays.length === required;
    },
    (data) => ({
      message: `availableDays count must match sessionFrequency: ` +
               `${SESSION_DAY_COUNT[data.sessionFrequency]} days required for ${data.sessionFrequency}, ` +
               `but ${data.availableDays.length} provided`,
      path: ['availableDays'],
    }),
  )
  .refine(
    (data) => data.preferredStartHour < data.preferredEndHour,
    {
      message: 'preferredStartHour must be before preferredEndHour',
      path: ['preferredStartHour'],
    },
  );

export const getEnrollmentsQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']).optional(),
});

export const updateEnrollmentPricingSchema = z.object({
  yearlyPrice: z.number().positive('Yearly price must be positive').optional(),
  billingFrequency: z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
});

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;
export type GetEnrollmentsQuery = z.infer<typeof getEnrollmentsQuerySchema>;
export type UpdateEnrollmentPricingInput = z.infer<typeof updateEnrollmentPricingSchema>;
