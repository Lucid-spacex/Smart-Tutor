import prisma from '../../config/database';
import { hashPassword, comparePassword } from '../../utils/password.util';
import { generateAccessToken, generateRefreshToken, hashToken, verifyRefreshToken } from '../../utils/token.util';
import { generateOTP, sendVerificationEmail } from '../../utils/email.util';
import { RegisterData, VerifyData, LoginData, RefreshData, AuthResponse } from './types';

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

    // In production, store OTP securely and send email
    // For MVP, we'll just log it
    console.log(`OTP for ${data.email}: ${otp}`);
    await sendVerificationEmail(data.email, otp);

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

    // In production, verify OTP against stored value
    // For MVP, we'll accept any 6-digit OTP
    if (data.otp.length !== 6) {
      throw new Error('Invalid OTP');
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

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      user: this.sanitizeUser(user),
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

      // Update refresh token
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: {
          tokenHash: hashToken(newRefreshToken),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

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

  private sanitizeUser(user: any) {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }
}
