import prisma from '../../config/database';
import { hashPassword, comparePassword } from '../../utils/password.util';
import { generateAccessToken, generateRefreshToken, hashToken, verifyRefreshToken } from '../../utils/token.util';
import { sendVerificationEmail } from '../../utils/email.util';
import { generateOTP, storeOTP, verifyOTP } from '../../utils/otp.util';
import { RegisterData, VerifyData, LoginData, StudentLoginData, RefreshData, ChangePasswordData, ChangePinData, AuthResponse } from './types';
import crypto from 'crypto';
import { logger } from '../../config/logger';
import { AppError } from '../../middleware/error-handler.middleware';
import { CloudinaryService } from '../../services/cloudinary.service';
import { TutorApplicationService } from '../tutor-application/tutor-application.service';
import { NotificationCoreService } from '../notifications/notification-core.service';
import { NotificationCategory, NotificationType } from '@prisma/client';

export class AuthService {
  private cloudinaryService: CloudinaryService;
  private tutorApplicationService: TutorApplicationService;
  private notificationCore: NotificationCoreService;

  constructor() {
    this.cloudinaryService = new CloudinaryService();
    this.tutorApplicationService = new TutorApplicationService();
    this.notificationCore = new NotificationCoreService();
  }

  async register(data: RegisterData): Promise<{ message: string; userId: string; emailSent: boolean }> {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new AppError(409, 'User with this email already exists');
    }

    const passwordHash = await hashPassword(data.password);
    const otp = generateOTP();

    // Derive fullName from name parts if not provided (backward compatibility)
    const fullName = data.fullName || [data.firstName, data.middleName, data.lastName]
      .filter(Boolean)
      .join(' ');

    const user = await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName,
        fullName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        passwordHash,
        role: data.role,
        status: 'UNVERIFIED',
      },
    });

    // Store OTP securely in database
    await storeOTP(data.email, otp);

    // Send OTP via email
    const emailSent = await sendVerificationEmail(data.email, otp);

    // Notify admins of new user registration (include role)
    await this.notificationCore.notify({
      recipientRole: 'ADMIN',
      type: 'USER_REGISTERED' as NotificationType,
      category: 'USERS' as NotificationCategory,
      title: 'New User Registration',
      body: `New ${data.role} registered: ${data.email}`,
      entityType: 'User',
      entityId: user.id,
      dedupeKey: `user-registered-${user.id}`,
    });

    logger.info({ email: data.email, emailSent }, 'User registered successfully');

    return {
      message: 'Registration successful. Please verify your email.',
      userId: user.id,
      emailSent,
    };
  }

  async verify(data: VerifyData): Promise<{ message: string; user: any }> {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Verify OTP against stored value
    const isValidOTP = await verifyOTP(data.email, data.otp);

    if (!isValidOTP) {
      logger.warn({ email: data.email }, 'Invalid OTP verification attempt');
      throw new AppError(400, 'Invalid or expired OTP');
    }

    // Update user status based on role
    const newStatus = user.role === 'PARENT' ? 'ACTIVE' : 'PENDING_VETTING';

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { status: newStatus },
    });

    // Create tutor application draft if tutor (not tutor profile)
    if (user.role === 'TUTOR') {
      await this.tutorApplicationService.createDraftApplication(user.id);
    }

    // Notify admins of user verification (include role)
    await this.notificationCore.notify({
      recipientRole: 'ADMIN',
      type: 'USER_VERIFIED' as NotificationType,
      category: 'USERS' as NotificationCategory,
      title: 'User Verified',
      body: `${user.role} verified email: ${user.email}`,
      entityType: 'User',
      entityId: user.id,
      dedupeKey: `user-verified-${user.id}`,
    });

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
      throw new AppError(401, 'Invalid credentials');
    }

    const isValidPassword = await comparePassword(data.password, user.passwordHash);

    if (!isValidPassword) {
      logger.warn({ email: data.email }, 'Failed login attempt - invalid password');
      throw new AppError(401, 'Invalid credentials');
    }

    if (user.status === 'UNVERIFIED') {
      throw new AppError(403, 'Please verify your email first');
    }

    if (user.status === 'SUSPENDED' || user.status === 'REJECTED') {
      throw new AppError(403, 'Account is not active');
    }

    if (user.role === 'TUTOR' && user.status === 'PENDING_VETTING') {
      throw new AppError(403, 'Your account is pending admin approval');
    }

    // Store refresh token with token family for rotation detection
    const tokenFamily = crypto.randomUUID();

    const accessToken = generateAccessToken({
      userId: user.id,
      role: user.role,
      sid: tokenFamily,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      role: user.role,
      sid: tokenFamily,
    });

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
    // Three-factor login: parentEmail + studentCode + studentPin
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
      throw new AppError(401, 'Invalid credentials');
    }

    // Verify parent email matches (case-insensitive)
    // Get the parent user via the parentId field
    const parentUser = await prisma.user.findUnique({
      where: { id: studentUser.parentId || '' },
      select: { email: true },
    });

    if (!parentUser || parentUser.email?.toLowerCase() !== data.parentEmail.toLowerCase()) {
      logger.warn({ studentCode: data.studentCode, parentEmail: data.parentEmail }, 'Failed student login - parent email mismatch');
      throw new AppError(401, 'Invalid credentials');
    }

    // Verify PIN
    const isValidPin = await comparePassword(data.studentPin, studentUser.passwordHash);
    if (!isValidPin) {
      logger.warn({ studentCode: data.studentCode }, 'Failed student login - invalid PIN');
      throw new AppError(401, 'Invalid credentials');
    }

    // Check student status
    if (studentUser.status === 'SUSPENDED') {
      throw new AppError(403, 'Account is suspended. Please contact your parent or admin.');
    }

    // Store refresh token with token family for rotation detection
    const tokenFamily = crypto.randomUUID();

    const accessToken = generateAccessToken({
      userId: studentUser.id,
      role: studentUser.role,
      sid: tokenFamily,
    });

    const refreshToken = generateRefreshToken({
      userId: studentUser.id,
      role: studentUser.role,
      sid: tokenFamily,
    });
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
        logger.warn({ userId: payload.userId }, 'Invalid refresh token attempt');
        throw new AppError(401, 'Invalid authentication token. Please login again.', 'TOKEN_INVALID');
      }

      if (storedToken.expiresAt < new Date()) {
        await prisma.refreshToken.delete({ where: { id: storedToken.id } });
        logger.info({ userId: payload.userId }, 'Refresh token expired');
        throw new AppError(401, 'Your session has expired. Please login again.', 'TOKEN_EXPIRED');
      }

      // Reuse detection: if the token has been revoked, delete the entire family (potential theft)
      if (storedToken.revokedAt) {
        await prisma.refreshToken.deleteMany({
          where: { tokenFamily: storedToken.tokenFamily },
        });
        logger.warn({ userId: payload.userId, tokenFamily: storedToken.tokenFamily }, 'Refresh token revoked due to suspicious activity');
        throw new AppError(401, 'Your session was revoked due to suspicious activity. Please login again.', 'TOKEN_REVOKED');
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        throw new AppError(404, 'User not found');
      }

      const newAccessToken = generateAccessToken({
        userId: user.id,
        role: user.role,
        sid: storedToken.tokenFamily,
      });

      const newRefreshToken = generateRefreshToken({
        userId: user.id,
        role: user.role,
        sid: storedToken.tokenFamily,
      });

      const newTokenHash = hashToken(newRefreshToken);

      // Rotate refresh token: mark old as revoked (for reuse detection), issue new one in same family
      // Use a transaction with a retry mechanism to handle race conditions
      await prisma.$transaction(async (tx) => {
        // Re-check that the token hasn't been revoked within the transaction
        const currentToken = await tx.refreshToken.findUnique({
          where: { id: storedToken.id },
        });

        if (!currentToken || currentToken.revokedAt) {
          logger.warn({ userId: payload.userId }, 'Refresh token was already used in concurrent request');
          throw new AppError(401, 'Refresh token was already used. Please login again.', 'TOKEN_ALREADY_USED');
        }

        // Mark old token as revoked
        await tx.refreshToken.update({
          where: { id: storedToken.id },
          data: { revokedAt: new Date() },
        });

        // Create new token
        await tx.refreshToken.create({
          data: {
            userId: user.id,
            tokenHash: newTokenHash,
            tokenFamily: storedToken.tokenFamily,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error({ error }, 'Unexpected error during token refresh');
      throw new AppError(401, 'Invalid authentication token. Please login again.', 'TOKEN_INVALID');
    }
  }

  async logout(userId: string): Promise<{ message: string }> {
    // Revoke the entire token family on logout
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { revokedAt: new Date() },
    });

    return { message: 'Logout successful' };
  }

  async getCurrentUser(userId: string): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        studentCode: true,
        parentId: true,
        timezone: true,
        profilePicture: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    return this.sanitizeUser(user);
  }

  async changePassword(userId: string, data: ChangePasswordData): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Students should use changePin, not changePassword
    if (user.role === 'STUDENT') {
      throw new AppError(400, 'Students must use the PIN change endpoint to update their PIN');
    }

    const isValidPassword = await comparePassword(data.currentPassword, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError(401, 'Current password is incorrect');
    }

    const newPasswordHash = await hashPassword(data.newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    // Revoke the entire token family on password change
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { revokedAt: new Date() },
    });

    logger.info({ userId }, 'Password changed successfully');

    return { message: 'Password changed successfully. Please login again.' };
  }

  async changePin(userId: string, data: ChangePinData): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Only students can change PIN
    if (user.role !== 'STUDENT') {
      throw new AppError(400, 'Only students can change their PIN');
    }

    const isValidPin = await comparePassword(data.currentPin, user.passwordHash);
    if (!isValidPin) {
      throw new AppError(401, 'Current PIN is incorrect');
    }

    const newPinHash = await hashPassword(data.newPin);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPinHash },
    });

    // Revoke the entire token family on PIN change
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { revokedAt: new Date() },
    });

    logger.info({ userId }, 'Student PIN changed successfully');

    return { message: 'PIN changed successfully. Please login again.' };
  }

  async updateTimezone(userId: string, timezone: string): Promise<{ message: string }> {
    try {
      // Validate IANA timezone string using Intl API
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch {
      throw new AppError(400, 'Invalid timezone format. Expected IANA format (e.g., "Africa/Lagos", "America/New_York", "UTC")');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { timezone },
    });

    logger.info({ userId, timezone }, 'Timezone updated successfully');

    return { message: 'Timezone updated successfully' };
  }

  async resendOtp(email: string): Promise<{ message: string; emailSent: boolean }> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    if (user.status !== 'UNVERIFIED') {
      throw new AppError(400, 'Account is already verified');
    }

    const otp = generateOTP();

    // Store OTP securely in database
    await storeOTP(email, otp);

    // Send OTP via email
    const emailSent = await sendVerificationEmail(email, otp);

    return {
      message: 'OTP sent successfully',
      emailSent,
    };
  }

  async updateProfilePicture(userId: string, fileBase64: string): Promise<{ message: string; profilePicture: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Delete old profile picture from Cloudinary if it exists
    if (user.profilePicture) {
      // Extract public ID from URL (Cloudinary URLs follow a pattern)
      const publicId = this.extractPublicIdFromUrl(user.profilePicture);
      if (publicId) {
        await this.cloudinaryService.deleteFile(publicId);
      }
    }

    // Upload new profile picture to Cloudinary
    const uploadResult = await this.cloudinaryService.uploadFile(
      fileBase64,
      'profile-pictures',
      'image'
    );

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { profilePicture: uploadResult.url },
    });

    logger.info({ userId }, 'Profile picture updated successfully');

    return {
      message: 'Profile picture updated successfully',
      profilePicture: updatedUser.profilePicture || '',
    };
  }

  async deleteProfilePicture(userId: string): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Delete profile picture from Cloudinary if it exists
    if (user.profilePicture) {
      const publicId = this.extractPublicIdFromUrl(user.profilePicture);
      if (publicId) {
        await this.cloudinaryService.deleteFile(publicId);
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { profilePicture: null },
    });

    logger.info({ userId }, 'Profile picture deleted successfully');

    return {
      message: 'Profile picture deleted successfully',
    };
  }

  /**
   * Extract Cloudinary public ID from URL
   * Example: https://res.cloudinary.com/cloud-name/image/upload/v1234567890/folder/public_id.jpg
   * Returns: folder/public_id
   */
  private extractPublicIdFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      
      // Find the upload/version folder and get everything after it
      const uploadIndex = pathParts.indexOf('upload');
      if (uploadIndex === -1 || uploadIndex === pathParts.length - 1) {
        return null;
      }

      // Skip the version number (starts with v)
      const startIndex = uploadIndex + 2;
      const publicIdWithExtension = pathParts.slice(startIndex).join('/');
      
      // Remove file extension
      const publicId = publicIdWithExtension.replace(/\.[^/.]+$/, '');
      
      return publicId;
    } catch {
      return null;
    }
  }

  private sanitizeUser(user: any) {
    const { passwordHash, parentId, ...sanitized } = user;
    // Include studentCode for students in response (it's an identifier, not a secret)
    return sanitized;
  }
}
