// Stub for email/OTP functionality
// In production, this would integrate with an email service like SendGrid, AWS SES, etc.

export const sendVerificationEmail = async (email: string, otp: string): Promise<void> => {
  console.log(`[EMAIL STUB] Sending verification email to ${email} with OTP: ${otp}`);
  // TODO: Implement actual email sending logic
};

export const sendOTP = async (phone: string, otp: string): Promise<void> => {
  console.log(`[SMS STUB] Sending OTP to ${phone}: ${otp}`);
  // TODO: Implement actual SMS sending logic
};

export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
