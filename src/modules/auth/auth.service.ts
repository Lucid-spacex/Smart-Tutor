import prisma from '../../config/database';
import { hashPassword, comparePassword } from '../../utils/password.util';
import { generateAccessToken, generateRefreshToken, hashToken, verifyRefreshToken } from '../../utils/token.util';
import { sendVerificationEmail } from '../../utils/email.util';
import { generateOTP, storeOTP, verifyOTP } from '../../utils/otp.util';
import { RegisterData, VerifyData, LoginData, StudentLoginData, RefreshData, ChangePasswordData, AuthResponse } from './types';
import crypto from 'crypto';
import { logger } from '../../config/logger';

export class AuthService {
  async register(data: RegisterData): Promise<{ message: string; userId: string }> {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const passwordHash = await hashPassword(data.password);
    const otp = generateOTP();

    const user = await prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        passwordHash,
        role: data.role,
        status: 'UNVERIFIED',
      },
    });

    // Store OTP securely in database
    await storeOTP(data.email, otp);

    // Send OTP via email
    await sendVerificationEmail(data.email, otp);

    logger.info({ email: data.email }, 'User registered successfully');

    return {
      message: 'Registration successful. Please verify your email.',
      userId: user.id,
    };
  }

  async verify(data: VerifyData): Promise<{ message: string; user: any }> {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify OTP against stored value
    const isValidOTP = await verifyOTP(data.email, data.otp);

    if (!isValidOTP) {
      logger.warn({ email: data.email }, 'Invalid OTP verification attempt');
      throw new Error('Invalid or expired OTP');
    }

    // Update user status based on role
    const newStatus = user.role === 'PARENT' ? 'ACTIVE' : 'PENDING_VETTING';

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { status: newStatus },
    });

    // Create tutor profile if tutor
    if (user.role === 'TUTOR') {
      await prisma.tutorProfile.create({
        data: {
          userId: user.id,
          subjects: [],
          bio: '',
          hourlyRate: 0,
          availability: {},
        },
      });
    }

    return {
      message: 'Email verified successfully',
      user: this.sanitizeUser(updatedUser),
    };
  }

  async login(data: LoginData): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await comparePassword(data.password, user.passwordHash);

    if (!isValidPassword) {
      logger.warn({ email: data.email }, 'Failed login attempt - invalid password');
      throw new Error('Invalid credentials');
    }

    if (user.status === 'UNVERIFIED') {
      throw new Error('Please verify your email first');
    }

    if (user.status === 'SUSPENDED' || user.status === 'REJECTED') {
      throw new Error('Account is not active');
    }

    if (user.role === 'TUTOR' && user.status === 'PENDING_VETTING') {
      throw new Error('Your account is pending admin approval');
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      role: user.role,
    });

    // Store refresh token with token family for rotation detection
    const tokenFamily = crypto.randomUUID();
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        tokenFamily,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  async studentLogin(data: StudentLoginData): Promise<AuthResponse> {
    // Three-factor login: parentEmail + studentCode + studentPassword
    // Look up by studentCode (case-insensitive)
    const studentUser = await prisma.user.findFirst({
      where: {
        studentCode: {
          equals: data.studentCode,
          mode: 'insensitive',
        },
        role: 'STUDENT',
      },
    });

    if (!studentUser) {
      logger.warn({ studentCode: data.studentCode }, 'Failed student login - student not found');
      throw new Error('Invalid credentials');
    }

    // Verify parent email matches (case-insensitive)
    // Get the parent user via the parentId field
    const parentUser = await prisma.user.findUnique({
      where: { id: studentUser.parentId || '' },
      select: { email: true },
    });

    if (!parentUser || parentUser.email?.toLowerCase() !== data.parentEmail.toLowerCase()) {
      logger.warn({ studentCode: data.studentCode, parentEmail: data.parentEmail }, 'Failed student login - parent email mismatch');
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await comparePassword(data.studentPassword, studentUser.passwordHash);
    if (!isValidPassword) {
      logger.warn({ studentCode: data.studentCode }, 'Failed student login - invalid password');
      throw new Error('Invalid credentials');
    }

    // Check student status
    if (studentUser.status === 'SUSPENDED') {
      throw new Error('Account is suspended. Please contact your parent or admin.');
    }

    const accessToken = generateAccessToken({
      userId: studentUser.id,
      role: studentUser.role,
    });

    const refreshToken = generateRefreshToken({
      userId: studentUser.id,
      role: studentUser.role,
    });

    // Store refresh token with token family for rotation detection
    const tokenFamily = crypto.randomUUID();
    await prisma.refreshToken.create({
      data: {
        userId: studentUser.id,
        tokenHash: hashToken(refreshToken),
        tokenFamily,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    logger.info({ studentCode: data.studentCode }, 'Student login successful');

    return {
      user: this.sanitizeUser(studentUser),
      accessToken,
      refreshToken,
    };
  }

  async refresh(data: RefreshData): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload = verifyRefreshToken(data.refreshToken);
      const tokenHash = hashToken(data.refreshToken);

      const storedToken = await prisma.refreshToken.findUnique({
        where: { tokenHash },
      });

      if (!storedToken || storedToken.userId !== payload.userId) {
        throw new Error('Invalid refresh token');
      }

      if (storedToken.expiresAt < new Date()) {
        await prisma.refreshToken.delete({ where: { id: storedToken.id } });
        throw new Error('Refresh token expired');
      }

      // Reuse detection: if the token has been revoked, delete the entire family (potential theft)
      if (storedToken.revokedAt) {
        await prisma.refreshToken.deleteMany({
          where: { tokenFamily: storedToken.tokenFamily },
        });
        throw new Error('Refresh token revoked due to suspicious activity. Please login again.');
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const newAccessToken = generateAccessToken({
        userId: user.id,
        role: user.role,
      });

      const newRefreshToken = generateRefreshToken({
        userId: user.id,
        role: user.role,
      });

      // Rotate refresh token: mark old as revoked (for reuse detection), issue new one in same family
      await prisma.$transaction([
        prisma.refreshToken.update({
          where: { id: storedToken.id },
          data: { revokedAt: new Date() },
        }),
        prisma.refreshToken.create({
          data: {
            userId: user.id,
            tokenHash: hashToken(newRefreshToken),
            tokenFamily: storedToken.tokenFamily,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        }),
      ]);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  async logout(userId: string): Promise<{ message: string }> {
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });

    return { message: 'Logout successful' };
  }

  async getCurrentUser(userId: string): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return this.sanitizeUser(user);
  }

  async changePassword(userId: string, data: ChangePasswordData): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const isValidPassword = await comparePassword(data.currentPassword, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    const newPasswordHash = await hashPassword(data.newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    // Revoke all refresh tokens for security
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });

    logger.info({ userId }, 'Password changed successfully');

    return { message: 'Password changed successfully. Please login again.' };
  }

  async updateTimezone(userId: string, timezone: string): Promise<{ message: string }> {
    try {
      // Validate IANA timezone string using Intl API
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch {
      throw new Error('Invalid timezone format. Expected IANA format (e.g., "Africa/Lagos", "America/New_York", "UTC")');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { timezone },
    });

    logger.info({ userId, timezone }, 'Timezone updated successfully');

    return { message: 'Timezone updated successfully' };
  }

  async resendOtp(email: string): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.status !== 'UNVERIFIED') {
      throw new Error('Account is already verified');
    }

    const otp = generateOTP();

    // Store OTP securely in database
    await storeOTP(email, otp);

    // Send OTP via email
    await sendVerificationEmail(email, otp);

    return {
      message: 'OTP sent successfully',
    };
  }

  private sanitizeUser(user: any) {
    const { passwordHash, parentId, ...sanitized } = user;
    // Include studentCode for students in response (it's an identifier, not a secret)
    return sanitized;
  }
}
