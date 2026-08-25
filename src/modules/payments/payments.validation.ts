import { z } from 'zod';

export const initiatePaymentSchema = z.object({
  enrollmentId: z.string().uuid('Invalid enrollment ID'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().default('USD'),
});

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
