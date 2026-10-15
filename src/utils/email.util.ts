import { logger } from '../config/logger';
import { config } from '../config/env.config';
import { Resend } from 'resend';

// Resend API client
let resendClient: Resend | null = null;

if (config.RESEND_API_KEY) {
  resendClient = new Resend(config.RESEND_API_KEY);
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
 * Returns boolean indicating success for credential/OTP emails
 */
export const sendEmail = async (data: EmailData, retryOnFailure: boolean = false): Promise<boolean> => {
  if (!resendClient) {
    logger.warn({ to: data.to }, 'Email not sent - Resend API not configured');
    return false;
  }

  const sender = parseEmailFrom(config.EMAIL_FROM || 'Teachmenest <no-reply@teachmenest.com>');

  const attemptSend = async (): Promise<boolean> => {
    try {
      const emailData: any = {
        from: sender.email,
        to: [data.to],
        subject: data.subject,
        html: data.html,
      };

      if (data.text) {
        emailData.text = data.text;
      }

      // Log the request details for debugging
      logger.info({
        to: data.to,
        subject: data.subject,
        from: sender.email,
        method: 'POST',
        endpoint: 'https://api.resend.com/emails',
      }, 'Sending email via Resend SDK');

      const result = await resendClient!.emails.send(emailData);

      if (result.error) {
        const error = `Resend API error: ${result.error.name} - ${result.error.message}`;
        logger.error({ to: data.to, subject: data.subject, error }, 'Email sending failed');
        throw new Error(error);
      }

      const messageId = result.data?.id;
      logger.info({ to: data.to, subject: data.subject, messageId }, 'Email sent successfully');
      return true;
    } catch (error) {
      const err = error as Error;
      // Re-throw with provider error code plainly (not swallowed)
      throw err;
    }
  };

  try {
    if (retryOnFailure) {
      // Retry with exponential backoff for 429 and 5xx errors
      const maxRetries = 3;
      const baseDelay = 1000; // 1 second

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          return await attemptSend();
        } catch (error) {
          const err = error as Error;
          const isRetryable = err.message.includes('429') || err.message.includes('5');

          if (!isRetryable || attempt === maxRetries - 1) {
            throw error;
          }

          const delay = baseDelay * Math.pow(2, attempt);
          logger.info({ to: data.to, attempt: attempt + 1, delay }, 'Retrying email send with backoff');
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    return await attemptSend();
  } catch (error) {
    const err = error as Error;
    logger.error({ to: data.to, subject: data.subject, error: err.message, stack: err.stack }, 'Email sending failed after retries');
    return false;
  }
};

/**
 * Send OTP verification email
 */
export const sendVerificationEmail = async (email: string, otp: string): Promise<boolean> => {
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

  return sendEmail({
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
): Promise<boolean> => {
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

  return sendEmail({
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
): Promise<boolean> => {
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

  return sendEmail({
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
): Promise<boolean> => {
  if (template === 'account_suspended') {
    await sendSuspensionEmail(email, data?.fullName || 'User', data?.reason || 'Policy violation');
    return true;
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
): Promise<boolean> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Teachmenest Notification</h2>
      <p>Dear ${name},</p>
      <p>${message}</p>
      <p>Please log in to your Teachmenest dashboard for more details.</p>
      <p style="color: #666; font-size: 12px;">Teachmenest Platform</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `Teachmenest: ${notificationType}`,
    html,
    text: message,
  }, true); // Retry on failure for non-secret emails
};

/**
 * Send account suspension email
 */
export const sendSuspensionEmail = async (
  email: string,
  name: string,
  reason: string
): Promise<boolean> => {
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

  return sendEmail({
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
