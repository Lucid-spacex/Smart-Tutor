import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  role: z.enum(['PARENT', 'TUTOR']),
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

export const timezoneSchema = z.object({
  timezone: z.string().regex(/^[A-Za-z]+\/[A-Za-z_]+$/, 'Invalid timezone format. Expected IANA format (e.g., "Africa/Lagos")'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type VerifyInput = z.infer<typeof verifySchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type StudentLoginInput = z.infer<typeof studentLoginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type TimezoneInput = z.infer<typeof timezoneSchema>;
