import { z } from 'zod';

// Tutor application fields (used in registration for TUTOR role)
const tutorApplicationFields = {
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
  ]),
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
  ]),
  aboutYou: z.array(z.string().max(60)).min(1, 'Please tell us about yourself').max(3, 'About you should be at most 3 paragraphs'),
};

export const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  middleName: z.string().optional(),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(), // For backward compatibility
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  address: z.string().min(5, 'Address is required for tutors').optional(), // Required for TUTOR, optional for PARENT
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  role: z.enum(['PARENT', 'TUTOR']),
  // Tutor application fields (required when role=TUTOR)
  ...tutorApplicationFields,
}).refine((data) => {
  // Either fullName OR (firstName + lastName) must be provided
  if (data.fullName) return true;
  if (data.firstName && data.lastName) return true;
  return false;
}, {
  message: 'Either fullName or firstName + lastName must be provided',
  path: ['fullName'],
}).refine((data) => {
  // Address is required for TUTOR
  if (data.role === 'TUTOR' && !data.address) return false;
  return true;
}, {
  message: 'Address is required for tutors',
  path: ['address'],
}).refine((data) => {
  // Tutor application fields are required when role=TUTOR
  if (data.role === 'TUTOR') {
    return !!(data.birthDay && data.birthMonth && data.country && data.city &&
              data.highestQualification && data.subjects && data.subjects.length > 0 &&
              data.levels && data.levels.length > 0 && data.yearsOfExperience !== undefined &&
              data.whyTeach && data.howHeard && data.aboutYou && data.aboutYou.length > 0);
  }
  return true;
}, {
  message: 'Tutor application fields are required when registering as a tutor',
  path: ['role'],
});

export const verifySchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const studentLoginSchema = z.object({
  parentEmail: z.string().email('Invalid parent email address'),
  studentCode: z.string().min(6, 'Student code must be at least 6 characters'),
  studentPin: z.string().length(6, 'Student PIN must be exactly 6 digits'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const resendOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export const changePinSchema = z.object({
  currentPin: z.string().length(6, 'Current PIN must be exactly 6 digits'),
  newPin: z.string().length(6, 'New PIN must be exactly 6 digits'),
});

export const timezoneSchema = z.object({
  timezone: z.string().regex(/^[A-Za-z]+\/[A-Za-z_]+$/, 'Invalid timezone format. Expected IANA format (e.g., "Africa/Lagos")'),
});

export const profilePictureSchema = z.object({
  profilePicture: z.string().url('Invalid profile picture URL').optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type VerifyInput = z.infer<typeof verifySchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type StudentLoginInput = z.infer<typeof studentLoginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type TimezoneInput = z.infer<typeof timezoneSchema>;
export type ProfilePictureInput = z.infer<typeof profilePictureSchema>;
