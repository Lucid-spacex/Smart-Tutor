import { z } from 'zod';

export const createTutorProfileSchema = z.object({
  subjects: z.array(z.string()).min(1, 'At least one subject is required'),
  bio: z.string().min(10, 'Bio must be at least 10 characters'),
  credentialsUrl: z.string().url('Invalid URL').optional(),
  hourlyRate: z.number().positive('Hourly rate must be positive'),
  availability: z.record(z.any()),
});

export const updateAvailabilitySchema = z.object({
  availability: z.record(z.any()),
});

export type CreateTutorProfileInput = z.infer<typeof createTutorProfileSchema>;
export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;
