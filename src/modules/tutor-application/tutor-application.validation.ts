import { z } from 'zod';

// Registration validation with firstName, lastName, middleName, address
export const registerTutorSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  middleName: z.string().optional(),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.literal('TUTOR'),
  address: z.string().min(5, 'Address is required for tutors'),
  fullName: z.string().optional(), // For backward compatibility
});

// Tutor application draft update (partial, autosave)
export const updateTutorApplicationSchema = z.object({
  birthDay: z.number().int().min(1).max(31).optional(),
  birthMonth: z.number().int().min(1).max(12).optional(),
  country: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  highestQualification: z.enum([
    'SSCE_WAEC',
    'OND_NCE',
    'HND',
    'BACHELORS',
    'BED_PGDE',
    'MASTERS',
    'PHD',
    'OTHER',
  ]).optional(),
  subjects: z.array(z.string().uuid()).optional(),
  levels: z.array(z.enum([
    'PRESCHOOL_TO_G1',
    'G2_TO_G4',
    'G5_TO_G8',
    'G9_TO_G12',
    'EXAM_LEVELS',
  ])).optional(),
  yearsOfExperience: z.number().int().min(0).optional(),
  whyTeach: z.string().optional(),
  howHeard: z.enum([
    'TEACHMENEST_TUTOR_OR_STAFF',
    'PARENT_OR_FAMILY',
    'FRIEND_OR_FAMILY',
    'INSTAGRAM',
    'FACEBOOK',
    'LINKEDIN',
    'WHATSAPP_GROUP',
    'GOOGLE_SEARCH',
    'JOB_BOARD',
    'OTHER',
  ]).optional(),
  aboutYou: z.array(z.string().max(60)).max(3).optional(), // Up to 3 paragraphs, 60 chars each
});

// Tutor application submit validation (full validation)
export const submitTutorApplicationSchema = z.object({
  birthDay: z.number().int().min(1).max(31, 'Invalid day'),
  birthMonth: z.number().int().min(1).max(12, 'Invalid month'),
  country: z.string().min(1, 'Country is required'),
  city: z.string().min(1, 'City is required'),
  highestQualification: z.enum([
    'SSCE_WAEC',
    'OND_NCE',
    'HND',
    'BACHELORS',
    'BED_PGDE',
    'MASTERS',
    'PHD',
    'OTHER',
  ], { required_error: 'Highest qualification is required' }),
  subjects: z.array(z.string().uuid()).min(1, 'At least one subject is required'),
  levels: z.array(z.enum([
    'PRESCHOOL_TO_G1',
    'G2_TO_G4',
    'G5_TO_G8',
    'G9_TO_G12',
    'EXAM_LEVELS',
  ])).min(1, 'At least one level is required'),
  yearsOfExperience: z.number().int().min(0, 'Years of experience is required'),
  whyTeach: z.string().min(10, 'Please tell us why you want to teach (at least 10 characters)'),
  howHeard: z.enum([
    'TEACHMENEST_TUTOR_OR_STAFF',
    'PARENT_OR_FAMILY',
    'FRIEND_OR_FAMILY',
    'INSTAGRAM',
    'FACEBOOK',
    'LINKEDIN',
    'WHATSAPP_GROUP',
    'GOOGLE_SEARCH',
    'JOB_BOARD',
    'OTHER',
  ], { required_error: 'Please let us know how you heard about us' }),
  aboutYou: z.array(z.string().max(60)).min(1, 'Please tell us about yourself').max(3, 'About you should be at most 3 paragraphs'),
});

// Admin vetting validation
export const updateTutorVettingSchema = z.object({
  vettingStatus: z.enum(['APPROVED', 'REJECTED']),
  reason: z.string().optional(),
});

// Helper types
export type RegisterTutorInput = z.infer<typeof registerTutorSchema>;
export type UpdateTutorApplicationInput = z.infer<typeof updateTutorApplicationSchema>;
export type SubmitTutorApplicationInput = z.infer<typeof submitTutorApplicationSchema>;
export type UpdateTutorVettingInput = z.infer<typeof updateTutorVettingSchema>;
