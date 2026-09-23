import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/config/database';
import { hashPassword } from '../../src/utils/password.util';

describe('Messaging Graph Permissions & Isolation Tests', () => {
  let adminToken = '', adminId = '';
  let parentToken = '', parentId = '';
  let assignedTutorToken = '', assignedTutorId = '';
  let unassignedTutorToken = '', unassignedTutorId = '';
  let studentToken = '', studentUserId = '', studentId = '';
  let testPassword = 'Password12345!';

  beforeAll(async () => {
    const passHash = await hashPassword(testPassword);

    // 1. Admin
    const adminUser = await prisma.user.create({
      data: {
        fullName: 'Admin User',
        email: `msg_admin_${Date.now()}@test.com`,
        phone: '+1000000001',
        passwordHash: passHash,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });
    adminId = adminUser.id;

    // 2. Parent
    const parentEmail = `msg_parent_${Date.now()}@test.com`;
    const parentUser = await prisma.user.create({
      data: {
        fullName: 'Message Parent',
        email: parentEmail,
        phone: '+1000000002',
        passwordHash: passHash,
        role: 'PARENT',
        status: 'ACTIVE',
      },
    });
    parentId = parentUser.id;

    // 3. Assigned Tutor
    const assignedTutorEmail = `msg_tutor_assigned_${Date.now()}@test.com`;
    const assignedTutor = await prisma.user.create({
      data: {
        fullName: 'Assigned Tutor',
        email: assignedTutorEmail,
        phone: '+1000000003',
        passwordHash: passHash,
        role: 'TUTOR',
        status: 'APPROVED',
      },
    });
    assignedTutorId = assignedTutor.id;

    await prisma.tutorProfile.create({
      data: {
        userId: assignedTutor.id,
        subjects: ['Math'],
        bio: 'Bio',
        hourlyRate: 50,
        availability: {},
        vettingStatus: 'APPROVED',
      },
    });

    // 4. Unassigned Tutor
    const unassignedTutorEmail = `msg_tutor_unassigned_${Date.now()}@test.com`;
    const unassignedTutor = await prisma.user.create({
      data: {
        fullName: 'Unassigned Tutor',
        email: unassignedTutorEmail,
        phone: '+1000000004',
        passwordHash: passHash,
        role: 'TUTOR',
        status: 'APPROVED',
      },
    });
    unassignedTutorId = unassignedTutor.id;

    await prisma.tutorProfile.create({
      data: {
        userId: unassignedTutor.id,
        subjects: ['History'],
        bio: 'Bio',
        hourlyRate: 50,
        availability: {},
        vettingStatus: 'APPROVED',
      },
    });

    // 5. Student
    const studentCode = `STU${Math.floor(1000 + Math.random() * 9000)}`;
    const studentUser = await prisma.user.create({
      data: {
        fullName: 'Message Student',
        studentCode,
        passwordHash: passHash,
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
        fullName: 'Message Student',
        dateOfBirth: new Date('2013-05-01'),
        gradeLevel: '5th',
      },
    });
    studentId = studentRecord.id;

    // Create Subject & Active Enrollment with assignedTutor
    const subject = await prisma.subject.create({
      data: {
        name: `Subject_${Date.now()}`,
        gradeBand: 'K-12',
        category: 'CORE',
      },
    });

    await prisma.enrollment.create({
      data: {
        studentId: studentRecord.id,
        subjectId: subject.id,
        tutorId: assignedTutor.id,
        sessionFrequency: 'TWICE_WEEKLY',
        availableDays: ['MON', 'THU'],
        billingFrequency: 'MONTHLY',
        yearlyPrice: 1200,
        status: 'ACTIVE',
        startDate: new Date(),
      },
    });

    // Login all users
    const [aRes, pRes, t1Res, t2Res, sRes] = await Promise.all([
      request(app).post('/auth/login').send({ email: adminUser.email, password: testPassword }),
      request(app).post('/auth/login').send({ email: parentEmail, password: testPassword }),
      request(app).post('/auth/login').send({ email: assignedTutorEmail, password: testPassword }),
      request(app).post('/auth/login').send({ email: unassignedTutorEmail, password: testPassword }),
      request(app).post('/auth/student-login').send({ parentEmail, studentCode, studentPassword: testPassword }),
    ]);

    adminToken = aRes.body.accessToken;
    parentToken = pRes.body.accessToken;
    assignedTutorToken = t1Res.body.accessToken;
    unassignedTutorToken = t2Res.body.accessToken;
    studentToken = sRes.body.accessToken;
  });

  describe('Allowed Role Pairs', () => {
    it('STUDENT -> Assigned TUTOR should succeed', async () => {
      const res = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          recipientId: assignedTutorId,
          body: 'Hello tutor! I have a question on homework.',
        });

      expect(res.status).toBe(201);
      expect(res.body.body).toBe('Hello tutor! I have a question on homework.');
    });

    it('Assigned TUTOR -> STUDENT should succeed', async () => {
      const res = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${assignedTutorToken}`)
        .send({
          recipientId: studentUserId,
          body: 'Hello student! See you tomorrow.',
        });

      expect(res.status).toBe(201);
    });

    it('PARENT -> ADMIN should succeed', async () => {
      const res = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          recipientId: adminId,
          body: 'Hello Admin, can you help with billing?',
        });

      expect(res.status).toBe(201);
    });

    it('TUTOR -> ADMIN should succeed', async () => {
      const res = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${assignedTutorToken}`)
        .send({
          recipientId: adminId,
          body: 'Hello Admin, question about my profile.',
        });

      expect(res.status).toBe(201);
    });
  });

  describe('Disallowed Role Pairs (Strict Isolation)', () => {
    it('PARENT -> TUTOR must be rejected with 403', async () => {
      const res = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          recipientId: assignedTutorId,
          body: 'Trying to message tutor directly',
        });

      expect(res.status).toBe(403);
    });

    it('TUTOR -> PARENT must be rejected with 403', async () => {
      const res = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${assignedTutorToken}`)
        .send({
          recipientId: parentId,
          body: 'Trying to message parent directly',
        });

      expect(res.status).toBe(403);
    });

    it('STUDENT -> ADMIN must be rejected with 403', async () => {
      const res = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          recipientId: adminId,
          body: 'Student trying to message admin',
        });

      expect(res.status).toBe(403);
    });

    it('STUDENT -> Unassigned TUTOR must be rejected with 403', async () => {
      const res = await request(app)
        .post('/messages')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          recipientId: unassignedTutorId,
          body: 'Student trying to message unassigned tutor',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('Threads & History', () => {
    it('should retrieve conversation threads with unread counts', async () => {
      const res = await request(app)
        .get('/messages/threads')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });
});
