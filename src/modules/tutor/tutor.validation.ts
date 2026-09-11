import { z } from 'zod';

export const createTutorProfileSchema = z.object({
  subjects: z.array(z.string()).min(1, 'At least one subject is required').max(20, 'Cannot have more than 20 subjects'),
  bio: z.string().min(10, 'Bio must be at least 10 characters').max(2000, 'Bio must be less than 2000 characters'),
  credentialsUrl: z.string().url('Invalid URL').max(500, 'URL must be less than 500 characters').optional(),
  hourlyRate: z.number().positive('Hourly rate must be positive').max(1000, 'Hourly rate must be less than 1000'),
  availability: z.record(z.any()),
});

export const updateAvailabilitySchema = z.object({
  availability: z.record(z.any()),
});

export type CreateTutorProfileInput = z.infer<typeof createTutorProfileSchema>;
export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;
