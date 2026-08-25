import { z } from 'zod';

export const createStudentSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
  gradeLevel: z.string().min(1, 'Grade level is required'),
  school: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
