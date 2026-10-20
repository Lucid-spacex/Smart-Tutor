import { z } from 'zod';
import { ScoredItemType } from '@prisma/client';

export const createScoredItemSchema = z.object({
  enrollmentId: z.string().uuid('Invalid enrollment ID'),
  type: z.nativeEnum(ScoredItemType),
  score: z.number().min(0, 'Score must be >= 0'),
  maxScore: z.number().positive('Max score must be > 0'),
  comment: z.string().optional(),
});

export const updateScoredItemSchema = z.object({
  score: z.number().min(0, 'Score must be >= 0').optional(),
  maxScore: z.number().positive('Max score must be > 0').optional(),
  comment: z.string().optional(),
});

export type CreateScoredItemInput = z.infer<typeof createScoredItemSchema>;
export type UpdateScoredItemInput = z.infer<typeof updateScoredItemSchema>;
