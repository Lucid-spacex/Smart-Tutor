import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/config/database';
import { hashPassword } from '../../src/utils/password.util';

describe('Sessions & Attendance Lock Integration Tests', () => {
  let adminToken = '', adminId = '';
  let tutorToken = '', tutorId = '';
  let parentToken = '', parentId = '';
  let studentToken = '', studentId = '', studentUserId = '';
  let enrollmentId = '';
  let sessionId = '';
  let testPassword = 'Password12345!';

  beforeAll(async () => {
    const passHash = await hashPassword(testPassword);

    const admin = await prisma.user.create({
      data: {
        fullName: 'Admin',
        email: `sess_admin_${Date.now()}@test.com`,
        passwordHash: passHash,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });
    adminId = admin.id;

    const tutor = await prisma.user.create({
      data: {
        fullName: 'Tutor',
        email: `sess_tutor_${Date.now()}@test.com`,
        passwordHash: passHash,
        role: 'TUTOR',
        status: 'APPROVED',
      },
    });
    tutorId = tutor.id;
    await prisma.tutorProfile.create({
      data: {
        userId: tutor.id,
        subjects: ['Math'],
        bio: 'Bio',
        hourlyRate: 50,
        availability: {},
        vettingStatus: 'APPROVED',
      },
    });

    const parent = await prisma.user.create({
      data: {
        fullName: 'Parent',
        email: `sess_parent_${Date.now()}@test.com`,
        passwordHash: passHash,
        role: 'PARENT',
        status: 'ACTIVE',
        timezone: 'America/New_York',
      },
    });
    parentId = parent.id;

    const studentUser = await prisma.user.create({
      data: {
        fullName: 'Student',
        studentCode: `SES${Math.floor(1000 + Math.random() * 9000)}`,
        passwordHash: passHash,
        role: 'STUDENT',
        status: 'ACTIVE',
        parentId: parent.id,
      },
    });
    studentUserId = studentUser.id;

    const studentRecord = await prisma.student.create({
      data: {
        parentId: parent.id,
        userId: studentUser.id,
        fullName: 'Student',
        dateOfBirth: new Date('2014-01-01'),
        gradeLevel: '4th',
      },
    });
    studentId = studentRecord.id;

    const subject = await prisma.subject.create({
      data: {
        name: `Math_Sess_${Date.now()}`,
        gradeBand: 'K-12',
        category: 'CORE',
      },
    });

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId: studentRecord.id,
        subjectId: subject.id,
        tutorId: tutor.id,
        sessionFrequency: 'WEEKLY',
        billingFrequency: 'MONTHLY',
        yearlyPrice: 1200,
        status: 'ACTIVE',
        startDate: new Date(),
      },
    });
    enrollmentId = enrollment.id;

    const [aRes, tRes, pRes, sRes] = await Promise.all([
      request(app).post('/auth/login').send({ email: admin.email, password: testPassword }),
      request(app).post('/auth/login').send({ email: tutor.email, password: testPassword }),
      request(app).post('/auth/login').send({ email: parent.email, password: testPassword }),
      request(app).post('/auth/student-login').send({ parentEmail: parent.email, studentCode: studentUser.studentCode, studentPassword: testPassword }),
    ]);

    adminToken = aRes.body.accessToken;
    tutorToken = tRes.body.accessToken;
    parentToken = pRes.body.accessToken;
    studentToken = sRes.body.accessToken;
  });

  describe('Admin Session Scheduling', () => {
    it('Admin creates session with participant', async () => {
      const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const res = await request(app)
        .post('/admin/sessions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tutorId,
          scheduledAt,
          durationMinutes: 60,
          zoomLink: 'https://zoom.us/j/123456789',
          participantEnrollmentIds: [enrollmentId],
        });

      expect(res.status).toBe(201);
      sessionId = res.body.id;
    });
  });

  describe('Tutor Session Permissions & Locks', () => {
    it('Tutor cannot mark participant attendance while session is still SCHEDULED', async () => {
      const res = await request(app)
        .patch(`/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          participants: [{ enrollmentId, attended: true }],
        });

      expect(res.status).toBe(400);
    });

    it('Tutor cannot modify scheduledAt or zoomLink', async () => {
      const newTime = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      await request(app)
        .patch(`/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          scheduledAt: newTime,
          zoomLink: 'https://evil.link',
          tutorNotes: 'Notes only',
        });

      const sessionInDb = await prisma.session.findUnique({ where: { id: sessionId } });
      expect(sessionInDb?.zoomLink).toBe('https://zoom.us/j/123456789');
      expect(sessionInDb?.tutorNotes).toBe('Notes only');
    });

    it('Tutor can mark session COMPLETED and record participant attendance', async () => {
      const res = await request(app)
        .patch(`/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          status: 'COMPLETED',
          tutorNotes: 'Class finished successfully',
          homeworkAssigned: 'Pages 10-15',
          participants: [{ enrollmentId, attended: true }],
        });

      expect(res.status).toBe(200);

      const participant = await prisma.sessionParticipant.findFirst({
        where: { sessionId, enrollmentId },
      });
      expect(participant?.attended).toBe(true);
    });
  });

  describe('Student Next Live Class & Attendance', () => {
    it('GET /student/me/attendance returns statistics and per-session breakdown', async () => {
      const res = await request(app)
        .get('/student/me/attendance')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.statistics.totalSessions).toBe(1);
      expect(res.body.statistics.attended).toBe(1);
      expect(res.body.statistics.percentage).toBe(100);
    });
  });
});
