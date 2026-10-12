import { z } from 'zod';

export const getSubjectsQuerySchema = z.object({
  category: z.enum(['CORE', 'ENRICHMENT', 'TEST_PREP']).optional(),
  gradeBandTier: z.enum(['PRESCHOOL_TO_G1', 'G2_TO_G4', 'G5_TO_G8', 'G9_TO_G12']).optional(),
});

export type GetSubjectsQuery = z.infer<typeof getSubjectsQuerySchema>;

export const pricingQuoteQuerySchema = z.object({
  studentId: z.string().uuid(),
  subjectIds: z.string().min(1), // Comma-separated list of subject IDs
});

export type PricingQuoteQuery = z.infer<typeof pricingQuoteQuerySchema>;
