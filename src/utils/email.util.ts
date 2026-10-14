import { logger } from '../config/logger';
import { config } from '../config/env.config';

// Resend API client
const RESEND_API_URL = 'https://api.resend.com/v3/smtp/email';

let resendApiKey: string | null = null;

if (config.RESEND_API_KEY) {
  resendApiKey = config.RESEND_API_KEY;
  logger.info('Resend API client initialized successfully');
} else {
  logger.warn('Resend API key not configured - email sending is disabled');
}

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
 * Parse EMAIL_FROM to extract email and name
 * Supports formats: "email@example.com" or "Name <email@example.com>"
 */
const parseEmailFrom = (emailFrom: string): { email: string; name: string } => {
  const match = emailFrom.match(/^(.*?)<(.*?)>$/);
  if (match) {
    return {
      name: match[1].trim(),
      email: match[2].trim(),
    };
  }
  return {
    name: 'Teachmenest',
    email: emailFrom.trim(),
  };
};

/**
 * Centralized email sending function
 * Handles all email delivery through Resend API
 */
export const sendEmail = async (data: EmailData): Promise<void> => {
  if (!resendApiKey) {
    logger.warn({ to: data.to }, 'Email not sent - Resend API not configured');
    return;
  }

  try {
    const sender = parseEmailFrom(config.EMAIL_FROM || 'Teachmenest <no-reply@teachmenest.com>');

    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: sender.email,
        to: data.to,
        subject: data.subject,
        html: data.html,
        text: data.text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${response.status} - ${error}`);
    }

    const messageId = response.headers.get('X-Message-Id');
    logger.info({ to: data.to, subject: data.subject, messageId }, 'Email sent successfully');
  } catch (error) {
    logger.error({ to: data.to, subject: data.subject, error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined }, 'Email sending failed');
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
      <p>Thank you for registering with Teachmenest. Please use the following verification code to complete your registration:</p>
      <div style="background: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333;">${otp}</span>
      </div>
      <p><strong>This code will expire in 15 minutes.</strong></p>
      <p>If you didn't request this verification, please ignore this email.</p>
      <p style="color: #666; font-size: 12px;">Teachmenest Platform</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: 'Verify Your Teachmenest Account',
    html,
    text: `Your verification code is: ${otp}. This code will expire in 15 minutes.`,
  });
};

/**
 * Send student credentials to parent (with PIN)
 */
export const sendStudentCredentialsEmail = async (
  parentEmail: string,
  parentName: string,
  studentName: string,
  studentCode: string,
  studentPin: string
): Promise<void> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Student Account Created</h2>
      <p>Dear ${parentName},</p>
      <p>A student account has been created for <strong>${studentName}</strong> on Teachmenest. Below are the login credentials:</p>
      
      <div style="background: #f4f4f4; padding: 20px; margin: 20px 0;">
        <p><strong>Student Code:</strong> <span style="font-size: 18px; font-weight: bold; color: #333;">${studentCode}</span></p>
        <p><strong>Student PIN:</strong> <span style="font-size: 24px; font-weight: bold; color: #333; letter-spacing: 3px;">${studentPin}</span></p>
      </div>
      
      <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
        <p style="margin: 0;"><strong>⚠️ Important Security Notice:</strong></p>
        <ul style="margin: 10px 0;">
          <li>Share these credentials <strong>only</strong> with your child</li>
          <li>Do not share the student code or PIN with anyone else</li>
          <li>Your child will use these credentials to log in independently</li>
          <li>Keep this information secure</li>
        </ul>
      </div>
      
      <p>Your child can log in using the Teachmenest student portal with these credentials.</p>
      <p style="color: #666; font-size: 12px;">Teachmenest Platform</p>
    </div>
  `;

  await sendEmail({
    to: parentEmail,
    subject: `Student Account Created for ${studentName}`,
    html,
    text: `Student Code: ${studentCode}, Student PIN: ${studentPin}. Please share these credentials only with your child.`,
  });
};

/**
 * Send PIN reset/regeneration email
 */
export const sendPinResetEmail = async (
  email: string,
  name: string,
  newPin: string
): Promise<void> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Student PIN Regenerated</h2>
      <p>Dear ${name},</p>
      <p>The student PIN has been successfully regenerated. Below is the new PIN:</p>
      
      <div style="background: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; color: #333; letter-spacing: 5px;">${newPin}</span>
      </div>
      
      <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
        <p style="margin: 0;"><strong>⚠️ Security Notice:</strong></p>
        <p style="margin: 5px 0;">Please share this new PIN only with your child.</p>
      </div>
      
      <p>If you didn't request this PIN change, please contact support immediately.</p>
      <p style="color: #666; font-size: 12px;">Teachmenest Platform</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: 'Student PIN Has Been Regenerated',
    html,
    text: `The new student PIN is: ${newPin}. Please share this PIN only with your child.`,
  });
};

// Legacy function name for backward compatibility
export const sendPasswordResetEmail = async (
  email: string,
  template: 'password_reset' | 'account_suspended' = 'password_reset',
  data?: any
): Promise<void> => {
  if (template === 'account_suspended') {
    return sendSuspensionEmail(email, data?.fullName || 'User', data?.reason || 'Policy violation');
  }
  return sendPinResetEmail(email, data?.name || 'User', data?.newPin || 'N/A');
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
      <h2 style="color: #333;">Teachmenest Notification</h2>
      <p>Dear ${name},</p>
      <p>${message}</p>
      <p>Please log in to your Teachmenest dashboard for more details.</p>
      <p style="color: #666; font-size: 12px;">Teachmenest Platform</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: `Teachmenest: ${notificationType}`,
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
      <p>Your Teachmenest account has been suspended due to the following reason:</p>
      
      <div style="background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0;">
        <p style="margin: 0;">${reason}</p>
      </div>
      
      <p>If you believe this is an error, or to reactivate your account, please contact our support team.</p>
      <p style="color: #666; font-size: 12px;">Teachmenest Platform</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: 'Your Teachmenest Account Has Been Suspended',
    html,
    text: `Your account has been suspended. Reason: ${reason}. Please contact support for assistance.`,
  });
};

// Legacy function for SMS OTP (not currently implemented)
export const sendOTP = async (phone: string, otp: string): Promise<void> => {
  logger.info({ phone }, 'SMS OTP not currently implemented');
  // TODO: Implement SMS sending via a provider like Twilio if needed
};
