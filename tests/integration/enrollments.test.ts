import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/config/database';
import { hashPassword } from '../../src/utils/password.util';

describe('Enrollment Flow Integration Tests', () => {
  jest.setTimeout(30000);
  let parentAccessToken: string;
  let otherParentToken: string;
  let parentId: string;
  let studentId: string;
  let subjectId1: string;
  let subjectId2: string;
  let subjectId3: string;
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
        timezone: 'America/New_York',
      },
    });
    parentId = parent.id;

    const otherParent = await prisma.user.create({
      data: {
        fullName: 'Other Parent',
        email: `other_parent_${Date.now()}@test.com`,
        passwordHash: passHash,
        role: 'PARENT',
        status: 'ACTIVE',
      },
    });

    // Create 3 test Subjects
    const s1 = await prisma.subject.create({
      data: {
        name: `Subject_Math_${Date.now()}`,
        gradeBand: '4-8',
        category: 'CORE',
      },
    });
    subjectId1 = s1.id;

    const s2 = await prisma.subject.create({
      data: {
        name: `Subject_Science_${Date.now()}`,
        gradeBand: '4-8',
        category: 'CORE',
      },
    });
    subjectId2 = s2.id;

    const s3 = await prisma.subject.create({
      data: {
        name: `Subject_English_${Date.now()}`,
        gradeBand: '4-8',
        category: 'CORE',
      },
    });
    subjectId3 = s3.id;

    // Login as parent to get access token
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({
        email: parent.email,
        password: testPassword,
      });
    parentAccessToken = loginResponse.body.accessToken;

    const otherLogin = await request(app)
      .post('/auth/login')
      .send({
        email: otherParent.email,
        password: testPassword,
      });
    otherParentToken = otherLogin.body.accessToken;
  });

  describe('POST /students (with Part B1 profile fields)', () => {
    it('should create a new student and auto-derive gradeBandTier from actualGrade', async () => {
      const response = await request(app)
        .post('/students')
        .set('Authorization', `Bearer ${parentAccessToken}`)
        .send({
          fullName: 'Test Student Grade 4',
          dateOfBirth: '2014-05-15',
          gradeLevel: '4th Grade',
          actualGrade: 'GRADE_4',
          gender: 'FEMALE',
          email: 'student.notify@example.com',
          preferredStartDate: '2026-10-01',
          school: 'Test School',
          notes: 'Test notes',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.fullName).toBe('Test Student Grade 4');
      expect(response.body.actualGrade).toBe('GRADE_4');
      expect(response.body.gender).toBe('FEMALE');
      expect(response.body.email).toBe('student.notify@example.com');
      // GRADE_4 maps deterministically to G2_TO_G4
      expect(response.body.gradeBandTier).toBe('G2_TO_G4');
      expect(response.body).toHaveProperty('studentCode');
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
      const response = await request(app).get('/students');
      expect(response.status).toBe(401);
    });
  });

  describe('POST /enrollments (Part B2 batch multi-subject)', () => {
    it('should reject enrollment if availableDays count does not match sessionFrequency', async () => {
      const response = await request(app)
        .post('/enrollments')
        .set('Authorization', `Bearer ${parentAccessToken}`)
        .send({
          studentId,
          subjectIds: [subjectId1],
          sessionFrequency: 'TWICE_WEEKLY',
          availableDays: ['MON', 'TUE', 'WED'], // 3 days provided, but TWICE_WEEKLY requires 2
          preferredStartHour: 15,
          preferredEndHour: 17,
          billingFrequency: 'MONTHLY',
          startDate: '2026-10-01',
        });

      expect(response.status).toBe(400);
      expect(response.body.details.some((d: any) => d.message.includes('availableDays count must match sessionFrequency'))).toBe(true);
    });

    it('should reject batch enrollment with duplicate subject IDs', async () => {
      const response = await request(app)
        .post('/enrollments')
        .set('Authorization', `Bearer ${parentAccessToken}`)
        .send({
          studentId,
          subjectIds: [subjectId1, subjectId1],
          sessionFrequency: 'TWICE_WEEKLY',
          availableDays: ['MON', 'THU'],
          preferredStartHour: 15,
          preferredEndHour: 17,
          billingFrequency: 'MONTHLY',
          startDate: '2026-10-01',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Duplicate subjects');
    });

    it('should reject batch enrollment if preferredStartHour >= preferredEndHour', async () => {
      const response = await request(app)
        .post('/enrollments')
        .set('Authorization', `Bearer ${parentAccessToken}`)
        .send({
          studentId,
          subjectIds: [subjectId1],
          sessionFrequency: 'TWICE_WEEKLY',
          availableDays: ['MON', 'THU'],
          preferredStartHour: 18,
          preferredEndHour: 16,
          billingFrequency: 'MONTHLY',
          startDate: '2026-10-01',
        });

      expect(response.status).toBe(400);
      expect(response.body.details.some((d: any) => d.message.includes('preferredStartHour must be before preferredEndHour'))).toBe(true);
    });

    let createdGroupId: string;

    it('should create a batch enrollment with 2 subjects sharing one enrollmentGroupId', async () => {
      const response = await request(app)
        .post('/enrollments')
        .set('Authorization', `Bearer ${parentAccessToken}`)
        .send({
          studentId,
          subjectIds: [subjectId1, subjectId2],
          sessionFrequency: 'TWICE_WEEKLY',
          availableDays: ['MON', 'THU'],
          preferredStartHour: 15,
          preferredEndHour: 17,
          billingFrequency: 'MONTHLY',
          startDate: '2026-10-01',
          endDate: '2027-06-01',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('enrollmentGroupId');
      expect(response.body).toHaveProperty('enrollments');
      expect(response.body.enrollments.length).toBe(2);

      createdGroupId = response.body.enrollmentGroupId;
      expect(createdGroupId).toBeDefined();

      // Verify all enrollments in the response share the enrollmentGroupId
      for (const enr of response.body.enrollments) {
        expect(enr.enrollmentGroupId).toBe(createdGroupId);
        expect(enr.studentId).toBe(studentId);
        expect(enr.sessionFrequency).toBe('TWICE_WEEKLY');
        expect(enr.availableDays).toEqual(['MON', 'THU']);
        expect(enr.preferredStartHour).toBe(15);
        expect(enr.preferredEndHour).toBe(17);
      }
    });

    it('should reject enrollment if student is already actively enrolled in that subject', async () => {
      const response = await request(app)
        .post('/enrollments')
        .set('Authorization', `Bearer ${parentAccessToken}`)
        .send({
          studentId,
          subjectIds: [subjectId1], // Already enrolled in previous test
          sessionFrequency: 'TWICE_WEEKLY',
          availableDays: ['TUE', 'FRI'],
          preferredStartHour: 14,
          preferredEndHour: 16,
          billingFrequency: 'MONTHLY',
          startDate: '2026-10-01',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already enrolled');
    });

    it('GET /enrollments/group/:groupId returns all enrollments in group for the parent', async () => {
      const response = await request(app)
        .get(`/enrollments/group/${createdGroupId}`)
        .set('Authorization', `Bearer ${parentAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.enrollmentGroupId).toBe(createdGroupId);
      expect(response.body.enrollments.length).toBe(2);
    });

    it('GET /enrollments/group/:groupId rejects unauthorized parent', async () => {
      const response = await request(app)
        .get(`/enrollments/group/${createdGroupId}`)
        .set('Authorization', `Bearer ${otherParentToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Not authorized');
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
});
