import { z } from 'zod';

// Valid ActualGrade values \u2014 must match the ActualGrade enum in schema.prisma.
// This is the structured field that drives gradeBandTier resolution; gradeLevel
// is the free-text display field and stays optional supplementary text.
const actualGradeValues = [
  'PRESCHOOL',
  'KINDERGARTEN',
  'GRADE_1',
  'GRADE_2',
  'GRADE_3',
  'GRADE_4',
  'GRADE_5',
  'GRADE_6',
  'GRADE_7',
  'GRADE_8',
  'GRADE_9',
  'GRADE_10',
  'GRADE_11',
  'GRADE_12',
] as const;

const genderValues = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'] as const;

export const createStudentSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters'),

  dateOfBirth: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid date of birth'),

  // Structured grade field \u2014 drives gradeBandTier resolution deterministically.
  // Required when provided; takes precedence over gradeLevel for tier mapping.
  actualGrade: z.enum(actualGradeValues),

  // Free-text display field kept for notes (e.g. "Springfield Elementary, Grade 5 repeated").
  // Still accepted for backward compat and used as fallback for gradeBandTier
  // resolution when actualGrade is absent.
  gradeLevel: z
    .string()
    .min(1, 'Grade level is required')
    .max(50, 'Grade level must be less than 50 characters'),

  gender: z.enum(genderValues).optional(),

  // Contact/notification email \u2014 NOT a login credential.
  // The three-factor student login (parent email + student code + student password)
  // is the only auth path regardless of whether this field is populated.
  email: z.string().email('Invalid student contact email').optional(),

  // Intended start date \u2014 captured at profile creation before a specific
  // enrollment/subject/tutor is finalised.
  preferredStartDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid preferred start date')
    .optional(),

  school: z
    .string()
    .max(100, 'School name must be less than 100 characters')
    .optional(),

  notes: z
    .string()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional(),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
