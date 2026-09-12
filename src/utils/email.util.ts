import { Resend } from 'resend';
import { logger } from '../config/logger';
import { config } from '../config/env.config';

// Initialize Resend client
const resend = config.RESEND_API_KEY ? new Resend(config.RESEND_API_KEY) : null;

// Email templates
const EMAIL_TEMPLATES = {
  VERIFICATION: 'verification-email',
  STUDENT_CREDENTIALS: 'student-credentials',
  PASSWORD_RESET: 'password-reset',
  NOTIFICATION: 'notification',
  SUSPENSION: 'account-suspension',
} as const;

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Centralized email sending function
 * Handles all email delivery through Resend
 */
export const sendEmail = async (data: EmailData): Promise<void> => {
  if (!resend) {
    logger.warn({ to: data.to }, 'Email not sent - RESEND_API_KEY not configured');
    return;
  }

  try {
    await resend.emails.send({
      from: config.EMAIL_FROM || 'Smart-Tutor <noreply@smarttutor.com>',
      to: data.to,
      subject: data.subject,
      html: data.html,
      text: data.text,
    });
    logger.info({ to: data.to, subject: data.subject }, 'Email sent successfully');
  } catch (error) {
    logger.error({ to: data.to, error: 'Email sending failed' }, 'Email error');
    // Don't throw - email failures shouldn't block the main flow
  }
};

/**
 * Send OTP verification email
 */
export const sendVerificationEmail = async (email: string, otp: string): Promise<void> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Verify Your Email Address</h2>
      <p>Thank you for registering with Smart-Tutor. Please use the following verification code to complete your registration:</p>
      <div style="background: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333;">${otp}</span>
      </div>
      <p><strong>This code will expire in 15 minutes.</strong></p>
      <p>If you didn't request this verification, please ignore this email.</p>
      <p style="color: #666; font-size: 12px;">Smart-Tutor Platform</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: 'Verify Your Smart-Tutor Account',
    html,
    text: `Your verification code is: ${otp}. This code will expire in 15 minutes.`,
  });
};

/**
 * Send student credentials to parent
 */
export const sendStudentCredentialsEmail = async (
  parentEmail: string,
  parentName: string,
  studentName: string,
  studentCode: string,
  password: string
): Promise<void> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Student Account Created</h2>
      <p>Dear ${parentName},</p>
      <p>A student account has been created for <strong>${studentName}</strong> on Smart-Tutor. Below are the login credentials:</p>
      
      <div style="background: #f4f4f4; padding: 20px; margin: 20px 0;">
        <p><strong>Student Code:</strong> <span style="font-size: 18px; font-weight: bold; color: #333;">${studentCode}</span></p>
        <p><strong>Password:</strong> <span style="font-size: 18px; font-weight: bold; color: #333;">${password}</span></p>
      </div>
      
      <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
        <p style="margin: 0;"><strong>⚠️ Important Security Notice:</strong></p>
        <ul style="margin: 10px 0;">
          <li>Share these credentials <strong>only</strong> with your child</li>
          <li>Do not share the student code or password with anyone else</li>
          <li>Your child will use these credentials to log in independently</li>
          <li>Keep this information secure</li>
        </ul>
      </div>
      
      <p>Your child can log in using the Smart-Tutor student portal with these credentials.</p>
      <p style="color: #666; font-size: 12px;">Smart-Tutor Platform</p>
    </div>
  `;

  await sendEmail({
    to: parentEmail,
    subject: `Student Account Created for ${studentName}`,
    html,
    text: `Student Code: ${studentCode}, Password: ${password}. Please share these credentials only with your child.`,
  });
};

/**
 * Send password reset/regeneration email
 */
export const sendPasswordResetEmail = async (
  email: string,
  name: string,
  newPassword: string
): Promise<void> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Password Regenerated</h2>
      <p>Dear ${name},</p>
      <p>Your password has been successfully regenerated. Below is your new temporary password:</p>
      
      <div style="background: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
        <span style="font-size: 24px; font-weight: bold; color: #333;">${newPassword}</span>
      </div>
      
      <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
        <p style="margin: 0;"><strong>⚠️ Security Notice:</strong></p>
        <p style="margin: 5px 0;">Please change this password immediately after logging in for better security.</p>
      </div>
      
      <p>If you didn't request this password change, please contact support immediately.</p>
      <p style="color: #666; font-size: 12px;">Smart-Tutor Platform</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: 'Your Password Has Been Regenerated',
    html,
    text: `Your new temporary password is: ${newPassword}. Please change it after logging in.`,
  });
};

/**
 * Send notification email
 */
export const sendNotificationEmail = async (
  email: string,
  name: string,
  notificationType: string,
  message: string
): Promise<void> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Smart-Tutor Notification</h2>
      <p>Dear ${name},</p>
      <p>${message}</p>
      <p>Please log in to your Smart-Tutor dashboard for more details.</p>
      <p style="color: #666; font-size: 12px;">Smart-Tutor Platform</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: `Smart-Tutor: ${notificationType}`,
    html,
    text: message,
  });
};

/**
 * Send account suspension email
 */
export const sendSuspensionEmail = async (
  email: string,
  name: string,
  reason: string
): Promise<void> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc3545;">Account Suspended</h2>
      <p>Dear ${name},</p>
      <p>Your Smart-Tutor account has been suspended due to the following reason:</p>
      
      <div style="background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0;">
        <p style="margin: 0;">${reason}</p>
      </div>
      
      <p>If you believe this is an error, or to reactivate your account, please contact our support team.</p>
      <p style="color: #666; font-size: 12px;">Smart-Tutor Platform</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: 'Your Smart-Tutor Account Has Been Suspended',
    html,
    text: `Your account has been suspended. Reason: ${reason}. Please contact support for assistance.`,
  });
};

// Legacy function for SMS OTP (not currently implemented)
export const sendOTP = async (phone: string, otp: string): Promise<void> => {
  logger.info({ phone }, 'SMS OTP not currently implemented');
  // TODO: Implement SMS sending via a provider like Twilio if needed
};
