import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/config/database';
import { hashPassword } from '../../src/utils/password.util';

describe('Enrollment Flow Integration Tests', () => {
  let parentAccessToken: string;
  let parentId: string;
  let studentId: string;
  let subjectId: string;
  let testPassword = 'Password12345!';

  beforeAll(async () => {
    const passHash = await hashPassword(testPassword);
    const parent = await prisma.user.create({
      data: {
        fullName: 'Enrollment Test Parent',
        email: `enr_parent_${Date.now()}@test.com`,
        phone: '+1222333444',
        passwordHash: passHash,
        role: 'PARENT',
        status: 'ACTIVE',
      },
    });
    parentId = parent.id;

    // Create Subject
    const subject = await prisma.subject.create({
      data: {
        name: `Subject_Enr_${Date.now()}`,
        gradeBand: '4-8',
        category: 'CORE',
      },
    });
    subjectId = subject.id;

    // Login as parent to get access token
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({
        email: parent.email,
        password: testPassword,
      });

    parentAccessToken = loginResponse.body.accessToken;
  });

  describe('POST /students', () => {
    it('should create a new student and generate student credentials', async () => {
      const response = await request(app)
        .post('/students')
        .set('Authorization', `Bearer ${parentAccessToken}`)
        .send({
          fullName: 'Test Student',
          dateOfBirth: '2014-05-15',
          gradeLevel: '4th Grade',
          school: 'Test School',
          notes: 'Test notes',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.fullName).toBe('Test Student');
      expect(response.body).toHaveProperty('studentCode');
      // Must NEVER return password
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('passwordHash');

      studentId = response.body.id;
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/students')
        .send({
          fullName: 'Test Student',
          dateOfBirth: '2014-05-15',
          gradeLevel: '4th Grade',
        });

      expect(response.status).toBe(401);
    });

    it('should fail with invalid data', async () => {
      const response = await request(app)
        .post('/students')
        .set('Authorization', `Bearer ${parentAccessToken}`)
        .send({
          fullName: 'Test Student',
          // Missing required fields
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /students', () => {
    it('should get all students for parent', async () => {
      const response = await request(app)
        .get('/students')
        .set('Authorization', `Bearer ${parentAccessToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/students');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /enrollments', () => {
    it('should create a new enrollment', async () => {
      const response = await request(app)
        .post('/enrollments')
        .set('Authorization', `Bearer ${parentAccessToken}`)
        .send({
          studentId: studentId,
          subjectId: subjectId,
          sessionFrequency: 'WEEKLY',
          billingFrequency: 'MONTHLY',
          startDate: '2025-02-01',
          endDate: '2025-06-01',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.studentId).toBe(studentId);
      expect(response.body.subjectId).toBe(subjectId);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/enrollments')
        .send({
          studentId: studentId,
          subjectId: subjectId,
          sessionFrequency: 'WEEKLY',
          startDate: '2025-02-01',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /enrollments', () => {
    it('should get all enrollments for parent', async () => {
      const response = await request(app)
        .get('/enrollments')
        .set('Authorization', `Bearer ${parentAccessToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should filter enrollments by status', async () => {
      const response = await request(app)
        .get('/enrollments?status=ACTIVE')
        .set('Authorization', `Bearer ${parentAccessToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /me', () => {
    it('should get parent profile', async () => {
      const response = await request(app)
        .get('/me')
        .set('Authorization', `Bearer ${parentAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('fullName');
      expect(response.body).toHaveProperty('email');
      expect(response.body.role).toBe('PARENT');
    });
  });
});
