import crypto from 'crypto';
import prisma from '../config/database';

const OTP_EXPIRY_MINUTES = 15; // OTP expires in 15 minutes

/**
 * Generate a secure 6-digit OTP
 */
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Hash OTP for secure storage
 */
export const hashOTP = (otp: string): string => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

/**
 * Store OTP securely in database
 */
export const storeOTP = async (email: string, otp: string): Promise<void> => {
  const otpHash = hashOTP(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Delete any existing OTPs for this email
  await prisma.otp.deleteMany({
    where: { email },
  });

  // Store new OTP
  await prisma.otp.create({
    data: {
      email,
      otpHash,
      expiresAt,
    },
  });
};

/**
 * Verify OTP against stored value
 */
export const verifyOTP = async (email: string, otp: string): Promise<boolean> => {
  const otpHash = hashOTP(otp);

  const storedOTP = await prisma.otp.findUnique({
    where: { otpHash },
  });

  if (!storedOTP) {
    return false;
  }

  // Check if OTP has expired
  if (storedOTP.expiresAt < new Date()) {
    // Clean up expired OTP
    await prisma.otp.delete({
      where: { id: storedOTP.id },
    });
    return false;
  }

  // Check if email matches
  if (storedOTP.email !== email) {
    return false;
  }

  // OTP is valid - delete it to prevent reuse
  await prisma.otp.delete({
    where: { id: storedOTP.id },
  });

  return true;
};

/**
 * Clean up expired OTPs (should be run periodically)
 */
export const cleanupExpiredOTPs = async (): Promise<void> => {
  await prisma.otp.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
};
