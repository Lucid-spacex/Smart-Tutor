import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/config/database';
import { hashPassword } from '../../src/utils/password.util';

describe('Auth & Identity Integration Tests', () => {
  let parentEmail = `parent_${Date.now()}@example.com`;
  let tutorEmail = `tutor_${Date.now()}@example.com`;
  let testPassword = 'SecurePassword123!';
  let parentToken = '';
  let studentToken = '';
  let studentCode = '';
  let studentPin = '123456';
  let studentId = '';
  let studentUserId = '';

  beforeAll(async () => {
    // Create test parent
    const parentPassHash = await hashPassword(testPassword);
    const parentUser = await prisma.user.create({
      data: {
        fullName: 'Integration Test Parent',
        email: parentEmail,
        phone: '+1234567890',
        passwordHash: parentPassHash,
        role: 'PARENT',
        status: 'ACTIVE',
        timezone: 'America/New_York',
      },
    });

    // Create test student
    studentCode = `TEST${Math.floor(1000 + Math.random() * 9000)}`;
    const studentPassHash = await hashPassword(studentPin);
    const studentUser = await prisma.user.create({
      data: {
        fullName: 'Integration Test Student',
        studentCode,
        passwordHash: studentPassHash,
        role: 'STUDENT',
        status: 'ACTIVE',
        parentId: parentUser.id,
      },
    });
    studentUserId = studentUser.id;

    const studentRecord = await prisma.student.create({
      data: {
        parentId: parentUser.id,
        userId: studentUser.id,
        fullName: 'Integration Test Student',
        dateOfBirth: new Date('2014-01-01'),
        gradeLevel: '4th Grade',
      },
    });
    studentId = studentRecord.id;

    // Login parent to get token
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: parentEmail, password: testPassword });
    parentToken = res.body.accessToken;

    // Login student to get token
    const studentRes = await request(app)
      .post('/api/auth/student-login')
      .send({
        parentEmail,
        studentCode,
        studentPin,
      });
    studentToken = studentRes.body.accessToken;
  });

  describe('Three-Factor Student Login', () => {
    it('should succeed with valid parentEmail + studentCode + studentPin', async () => {
      const response = await request(app)
        .post('/api/auth/student-login')
        .send({
          parentEmail,
          studentCode,
          studentPin,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.role).toBe('STUDENT');
      expect(response.body.user.studentCode).toBe(studentCode);
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    it('should fail with generic 401 when parentEmail is wrong', async () => {
      const response = await request(app)
        .post('/api/auth/student-login')
        .send({
          parentEmail: 'wrongparent@example.com',
          studentCode,
          studentPin,
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should fail with generic 401 when studentCode is wrong', async () => {
      const response = await request(app)
        .post('/api/auth/student-login')
        .send({
          parentEmail,
          studentCode: 'NONEXISTENTCODE',
          studentPin,
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should fail with generic 401 when studentPin is wrong', async () => {
      const response = await request(app)
        .post('/api/auth/student-login')
        .send({
          parentEmail,
          studentCode,
          studentPin: '654321',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });
  });

  describe('Parent & Tutor Registration & Gating', () => {
    it('should register a new parent and verify with OTP', async () => {
      const regEmail = `reg_parent_${Date.now()}@test.com`;
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'New Registered Parent',
          email: regEmail,
          phone: '+1987654321',
          password: 'Password12345!',
          role: 'PARENT',
        });

      expect(regRes.status).toBe(201);

      // Verify OTP (default test OTP accepted)
      const verifyRes = await request(app)
        .post('/api/auth/verify')
        .send({
          email: regEmail,
          otp: '123456',
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.user.status).toBe('ACTIVE');
    });

    it('should block tutor from login while status is PENDING_VETTING', async () => {
      const pendingTutorEmail = `pending_tutor_${Date.now()}@test.com`;
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'Pending Tutor',
          email: pendingTutorEmail,
          phone: '+1987654322',
          address: '123 Test Street, Test City',
          password: 'Password12345!',
          role: 'TUTOR',
        });

      expect(regRes.status).toBe(201);

      // Verify email -> status becomes PENDING_VETTING
      const verifyRes = await request(app)
        .post('/api/auth/verify')
        .send({
          email: pendingTutorEmail,
          otp: '123456',
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.user.status).toBe('PENDING_VETTING');

      // Attempt login -> should be blocked
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: pendingTutorEmail,
          password: 'Password12345!',
        });

      expect(loginRes.status).toBe(403);
      expect(loginRes.body.error).toBe('Your account is pending admin approval');
    });
  });

  describe('Account Status Per-Request Gating', () => {
    it('should immediately block requests from SUSPENDED accounts', async () => {
      // Create active user, log in, then suspend in DB
      const suspendEmail = `suspend_${Date.now()}@test.com`;
      const passHash = await hashPassword(testPassword);
      const user = await prisma.user.create({
        data: {
          fullName: 'To Be Suspended',
          email: suspendEmail,
          phone: '+1555555555',
          passwordHash: passHash,
          role: 'PARENT',
          status: 'ACTIVE',
        },
      });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: suspendEmail, password: testPassword });

      const token = loginRes.body.accessToken;

      // Make authenticated call -> should succeed
      const beforeRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(beforeRes.status).toBe(200);

      // Now suspend user in database
      await prisma.user.update({
        where: { id: user.id },
        data: { status: 'SUSPENDED' },
      });

      // Make authenticated call with same unexpired token -> must be blocked
      const afterRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(afterRes.status).toBe(403);
    });
  });

  describe('Timezone Handling', () => {
    it('should update timezone with valid IANA timezone', async () => {
      const res = await request(app)
        .patch('/api/auth/me/timezone')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ timezone: 'Africa/Lagos' });

      expect(res.status).toBe(200);

      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(meRes.body.timezone).toBe('Africa/Lagos');
    });

    it('should reject invalid timezone format', async () => {
      const res = await request(app)
        .patch('/api/auth/me/timezone')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ timezone: 'Invalid/NonExistent_Zone' });

      expect(res.status).toBe(400);
    });
  });

  describe('Student PIN Change', () => {
    it('should allow student to change their PIN', async () => {
      const res = await request(app)
        .patch('/api/auth/change-pin')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          currentPin: studentPin,
          newPin: '654321',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('PIN changed successfully. Please login again.');
    });

    it('should allow student to login with new PIN after change', async () => {
      // First change the PIN
      await request(app)
        .patch('/api/auth/change-pin')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          currentPin: studentPin,
          newPin: '654321',
        });

      // Login with new PIN
      const loginRes = await request(app)
        .post('/api/auth/student-login')
        .send({
          parentEmail,
          studentCode,
          studentPin: '654321',
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body).toHaveProperty('accessToken');
      expect(loginRes.body.user.role).toBe('STUDENT');
    });

    it('should reject non-student from changing PIN', async () => {
      const res = await request(app)
        .patch('/api/auth/change-pin')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          currentPin: '123456',
          newPin: '654321',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Only students can change their PIN');
    });

    it('should reject PIN change with wrong current PIN', async () => {
      // Login again to get fresh token after previous PIN change
      const loginRes = await request(app)
        .post('/api/auth/student-login')
        .send({
          parentEmail,
          studentCode,
          studentPin: '654321',
        });
      const freshToken = loginRes.body.accessToken;

      const res = await request(app)
        .patch('/api/auth/change-pin')
        .set('Authorization', `Bearer ${freshToken}`)
        .send({
          currentPin: '000000',
          newPin: '789012',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Current PIN is incorrect');
    });

    it('should reject PIN change with invalid new PIN format', async () => {
      // Login again to get fresh token
      const loginRes = await request(app)
        .post('/api/auth/student-login')
        .send({
          parentEmail,
          studentCode,
          studentPin: '654321',
        });
      const freshToken = loginRes.body.accessToken;

      const res = await request(app)
        .patch('/api/auth/change-pin')
        .set('Authorization', `Bearer ${freshToken}`)
        .send({
          currentPin: '654321',
          newPin: '12345', // Only 5 digits
        });

      expect(res.status).toBe(400);
    });

    it('should reject student from using change-password endpoint', async () => {
      // Login again to get fresh token
      const loginRes = await request(app)
        .post('/api/auth/student-login')
        .send({
          parentEmail,
          studentCode,
          studentPin: '654321',
        });
      const freshToken = loginRes.body.accessToken;

      const res = await request(app)
        .patch('/api/auth/change-password')
        .set('Authorization', `Bearer ${freshToken}`)
        .send({
          currentPassword: '654321',
          newPassword: 'NewPassword123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Students must use the PIN change endpoint to update their PIN');
    });
  });
});
