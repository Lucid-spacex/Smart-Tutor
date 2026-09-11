// Stub for email/OTP functionality
// In production, this would integrate with an email service like SendGrid, AWS SES, etc.
import { logger } from '../config/logger';

export const sendVerificationEmail = async (email: string, otp: string): Promise<void> => {
  logger.info({ email }, 'Sending verification email');
  // TODO: Implement actual email sending logic
  // SECURITY NOTE: Never log OTPs in production - this is a stub only
};

export const sendOTP = async (phone: string, otp: string): Promise<void> => {
  logger.info({ phone }, 'Sending OTP via SMS');
  // TODO: Implement actual SMS sending logic
  // SECURITY NOTE: Never log OTPs in production - this is a stub only
};

export const sendStudentCredentialsEmail = async (
  parentEmail: string,
  parentName: string,
  studentName: string,
  studentCode: string,
  password: string
): Promise<void> => {
  logger.info({ parentEmail, studentName, studentCode }, 'Sending student credentials email');
  // TODO: Implement actual email sending logic
  // SECURITY NOTE: Never log passwords in production - this is a stub only
  // Email should include:
  // - Parent's name
  // - Student's name
  // - Student Code (for login)
  // - Generated password (for login)
  // - Instructions to keep credentials secure and share only with the child
};
