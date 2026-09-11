import { z } from 'zod';

export const createStudentSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100, 'Full name must be less than 100 characters'),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
  gradeLevel: z.string().min(1, 'Grade level is required').max(50, 'Grade level must be less than 50 characters'),
  school: z.string().max(100, 'School name must be less than 100 characters').optional(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
