import { z } from 'zod';

export const initiatePaymentSchema = z
  .object({
    enrollmentId: z.string().uuid('Invalid enrollment ID').optional(),
    enrollmentGroupId: z.string().uuid('Invalid enrollment group ID').optional(),
    currency: z.string().default('USD'),
  })
  .refine(
    (data) => !!(data.enrollmentId || data.enrollmentGroupId),
    {
      message: 'Provide either enrollmentId or enrollmentGroupId',
      path: ['enrollmentId'],
    }
  )
  .refine(
    (data) => !(data.enrollmentId && data.enrollmentGroupId),
    {
      message: 'Provide either enrollmentId or enrollmentGroupId, not both',
      path: ['enrollmentGroupId'],
    }
  );

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
