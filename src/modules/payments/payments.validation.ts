import { z } from 'zod';

export const initiatePaymentSchema = z.object({
  enrollmentId: z.string().uuid('Invalid enrollment ID'),
  currency: z.string().default('USD'),
});

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
