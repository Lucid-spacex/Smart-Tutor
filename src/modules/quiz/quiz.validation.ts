import { z } from 'zod';

export const createQuizQuestionSchema = z.object({
  questionText: z.string().min(1, 'Question text is required').max(1000, 'Question text too long'),
  options: z.array(z.string().min(1, 'Option cannot be empty')).min(2, 'At least 2 options required').max(6, 'Maximum 6 options'),
  correctOptionIndex: z.number().int().min(0, 'Correct option index must be >= 0'),
  points: z.number().positive('Points must be positive').default(10),
  orderIndex: z.number().int().min(0, 'Order index must be >= 0'),
});

export const submitQuizAnswerSchema = z.object({
  questionId: z.string().uuid('Invalid question ID'),
  selectedOptionIndex: z.number().int().min(0, 'Selected option index must be >= 0'),
  timeTakenSeconds: z.number().int().min(0, 'Time taken must be >= 0'),
});

export const startQuizSchema = z.object({});

export const completeQuizSchema = z.object({});

export type CreateQuizQuestionInput = z.infer<typeof createQuizQuestionSchema>;
export type SubmitQuizAnswerInput = z.infer<typeof submitQuizAnswerSchema>;
export type StartQuizInput = z.infer<typeof startQuizSchema>;
export type CompleteQuizInput = z.infer<typeof completeQuizSchema>;
