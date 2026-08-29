import { z } from 'zod';

export const getSubjectsQuerySchema = z.object({
  category: z.enum(['CORE', 'ENRICHMENT']).optional(),
  gradeBand: z.string().optional(),
});

export type GetSubjectsQuery = z.infer<typeof getSubjectsQuerySchema>;
