import { hashPassword, comparePassword } from '../../src/utils/password.util';
import { generateOTP, hashOTP } from '../../src/utils/otp.util';
import { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } from '../../src/utils/token.util';

describe('Auth & Security Utilities Unit Tests', () => {
  describe('Password Utilities', () => {
    it('should hash passwords with bcrypt cost 12+', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      expect(hash).not.toEqual(password);
      expect(hash.length).toBeGreaterThan(50);
      expect(hash.startsWith('$2b$12$') || hash.startsWith('$2a$12$')).toBe(true);

      const isValid = await comparePassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await comparePassword('WrongPassword123!', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('OTP Utilities', () => {
    it('should generate 6-digit numeric OTPs and hash them with SHA-256', () => {
      const otp = generateOTP();
      expect(otp).toHaveLength(6);
      expect(/^\d{6}$/.test(otp)).toBe(true);

      const hashedOTP = hashOTP(otp);
      expect(hashedOTP).not.toEqual(otp);
      expect(hashedOTP).toHaveLength(64);
    });
  });

  describe('JWT Token Utilities', () => {
    it('should generate and verify short-lived access tokens and refresh tokens', () => {
      const payload = { userId: '123e4567-e89b-12d3-a456-426614174000', role: 'PARENT' };
      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);

      expect(typeof accessToken).toBe('string');
      expect(typeof refreshToken).toBe('string');

      const verifiedAccess = verifyAccessToken(accessToken);
      expect(verifiedAccess.userId).toBe(payload.userId);
      expect(verifiedAccess.role).toBe(payload.role);

      const verifiedRefresh = verifyRefreshToken(refreshToken);
      expect(verifiedRefresh.userId).toBe(payload.userId);
      expect(verifiedRefresh.role).toBe(payload.role);
    });
  });
});
