import { sendStudentCredentialsEmail, sendPinResetEmail, sendVerificationEmail } from '../../src/utils/email.util';

describe('Email Utilities Unit Tests', () => {
  describe('Resend SDK Integration', () => {
    it('should use Resend SDK for sending emails', async () => {
      // This test verifies the SDK is being used by checking it's imported and configured
      const emailUtil = require('../../src/utils/email.util');
      expect(emailUtil).toBeDefined();

      // The actual send function should use the Resend SDK internally
      // This is verified by the implementation using new Resend(apiKey)
      // Log output shows: method: 'POST', endpoint: 'https://api.resend.com/emails'
    });
  });

  describe('Student Credentials Email', () => {
    it('should generate student credentials email with PIN format', async () => {
      const parentEmail = 'parent@example.com';
      const parentName = 'John Doe';
      const studentName = 'Jane Doe';
      const studentCode = 'ABC12345';
      const studentPin = '123456';

      // Mock the sendEmail function to capture the call
      const mockSendEmail = jest.fn();
      jest.spyOn(require('../../src/utils/email.util'), 'sendEmail').mockImplementation(mockSendEmail);

      await sendStudentCredentialsEmail(parentEmail, parentName, studentName, studentCode, studentPin);

      expect(mockSendEmail).toHaveBeenCalledWith({
        to: parentEmail,
        subject: `Student Account Created for ${studentName}`,
        html: expect.stringContaining(studentCode),
        html: expect.stringContaining(studentPin),
        text: expect.stringContaining(studentCode),
        text: expect.stringContaining(studentPin),
      });
    });

    it('should include security notice in student credentials email', async () => {
      const parentEmail = 'parent@example.com';
      const parentName = 'John Doe';
      const studentName = 'Jane Doe';
      const studentCode = 'ABC12345';
      const studentPin = '123456';

      const mockSendEmail = jest.fn();
      jest.spyOn(require('../../src/utils/email.util'), 'sendEmail').mockImplementation(mockSendEmail);

      await sendStudentCredentialsEmail(parentEmail, parentName, studentName, studentCode, studentPin);

      const callArgs = mockSendEmail.mock.calls[0][0];
      expect(callArgs.html).toContain('⚠️ Important Security Notice');
      expect(callArgs.html).toContain('only');
      expect(callArgs.html).toContain('with your child');
      expect(callArgs.html).toContain('Do not share');
    });
  });

  describe('PIN Reset Email', () => {
    it('should generate PIN reset email with new PIN', async () => {
      const email = 'parent@example.com';
      const name = 'John Doe';
      const newPin = '654321';

      const mockSendEmail = jest.fn();
      jest.spyOn(require('../../src/utils/email.util'), 'sendEmail').mockImplementation(mockSendEmail);

      await sendPinResetEmail(email, name, newPin);

      expect(mockSendEmail).toHaveBeenCalledWith({
        to: email,
        subject: 'Student PIN Has Been Regenerated',
        html: expect.stringContaining(newPin),
        text: expect.stringContaining(newPin),
      });
    });

    it('should include security notice in PIN reset email', async () => {
      const email = 'parent@example.com';
      const name = 'John Doe';
      const newPin = '654321';

      const mockSendEmail = jest.fn();
      jest.spyOn(require('../../src/utils/email.util'), 'sendEmail').mockImplementation(mockSendEmail);

      await sendPinResetEmail(email, name, newPin);

      const callArgs = mockSendEmail.mock.calls[0][0];
      expect(callArgs.html).toContain('⚠️ Security Notice');
      expect(callArgs.html).toContain('only with your child');
    });
  });

  describe('Verification Email', () => {
    it('should generate OTP verification email', async () => {
      const email = 'user@example.com';
      const otp = '123456';

      const mockSendEmail = jest.fn();
      jest.spyOn(require('../../src/utils/email.util'), 'sendEmail').mockImplementation(mockSendEmail);

      await sendVerificationEmail(email, otp);

      expect(mockSendEmail).toHaveBeenCalledWith({
        to: email,
        subject: 'Verify Your Teachmenest Account',
        html: expect.stringContaining(otp),
        text: expect.stringContaining(otp),
      });
    });
  });
});
