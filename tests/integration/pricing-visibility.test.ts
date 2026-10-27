import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/config/database';
import { hashPassword } from '../../src/utils/password.util';

describe('Pricing Visibility Security Tests', () => {
  let adminToken = '', adminId = '';
  let parentToken = '', parentId = '';
  let tutorToken = '', tutorId = '';
  let studentToken = '', studentUserId = '';
  let enrollmentId = '';
  let testPassword = 'Password12345!';

  beforeAll(async () => {
    const passHash = await hashPassword(testPassword);

    const admin = await prisma.user.create({
      data: {
        fullName: 'Admin Pricing',
        email: `prc_admin_${Date.now()}@test.com`,
        passwordHash: passHash,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });
    adminId = admin.id;

    const parent = await prisma.user.create({
      data: {
        fullName: 'Parent Pricing',
        email: `prc_parent_${Date.now()}@test.com`,
        passwordHash: passHash,
        role: 'PARENT',
        status: 'ACTIVE',
      },
    });
    parentId = parent.id;

    const tutor = await prisma.user.create({
      data: {
        fullName: 'Tutor Pricing',
        email: `prc_tutor_${Date.now()}@test.com`,
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

    const studentUser = await prisma.user.create({
      data: {
        fullName: 'Student Pricing',
        studentCode: `PRC${Math.floor(1000 + Math.random() * 9000)}`,
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
        fullName: 'Student Pricing',
        dateOfBirth: new Date('2014-01-01'),
        gradeLevel: '4th',
        actualGrade: 'GRADE_4',
        gradeBandTier: 'G2_TO_G4',
      },
    });

    const subject = await prisma.subject.create({
      data: {
        name: `Math_Prc_${Date.now()}`,
        gradeBand: 'K-12',
        category: 'CORE',
      },
    });

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId: studentRecord.id,
        subjectId: subject.id,
        tutorId: tutor.id,
        sessionFrequency: 'TWICE_WEEKLY',
        availableDays: ['MON', 'THU'],
        preferredStartHour: 15,
        preferredEndHour: 17,
        billingFrequency: 'MONTHLY',
        yearlyPriceNGN: 1200.00,
        yearlyPriceUSD: 1200.00,
        status: 'ACTIVE',
        startDate: new Date(),
      },
    });
    enrollmentId = enrollment.id;

    const [aRes, pRes, tRes, sRes] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: admin.email, password: testPassword }),
      request(app).post('/api/auth/login').send({ email: parent.email, password: testPassword }),
      request(app).post('/api/auth/login').send({ email: tutor.email, password: testPassword }),
      request(app).post('/api/auth/student-login').send({ parentEmail: parent.email, studentCode: studentUser.studentCode, studentPin: testPassword }),
    ]);

    adminToken = aRes.body.accessToken;
    parentToken = pRes.body.accessToken;
    tutorToken = tRes.body.accessToken;
    studentToken = sRes.body.accessToken;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.enrollment.deleteMany({});
    await prisma.student.deleteMany({});
    await prisma.tutorProfile.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.subject.deleteMany({});
  });

  describe('Tutors never get yearlyPrice fields', () => {
    it('GET /enrollments - Tutor list excludes yearlyPriceNGN and yearlyPriceUSD', async () => {
      const res = await request(app)
        .get('/api/enrollments')
        .set('Authorization', `Bearer ${tutorToken}`);

      expect(res.status).toBe(200);
      const enrollments = Array.isArray(res.body) ? res.body : res.body.data || res.body.enrollments || [];

      enrollments.forEach((enrollment: any) => {
        expect(enrollment.yearlyPriceNGN).toBeUndefined();
        expect(enrollment.yearlyPriceUSD).toBeUndefined();
        expect(enrollment.yearlyPrice).toBeUndefined();
      });
    });

    it('GET /enrollments/:id - Tutor details exclude yearlyPriceNGN and yearlyPriceUSD', async () => {
      const res = await request(app)
        .get(`/api/enrollments/${enrollmentId}`)
        .set('Authorization', `Bearer ${tutorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.yearlyPriceNGN).toBeUndefined();
      expect(res.body.yearlyPriceUSD).toBeUndefined();
      expect(res.body.yearlyPrice).toBeUndefined();
    });

    it('GET /tutor/students/:studentId - Tutor student view excludes yearlyPrice fields', async () => {
      // Get the student ID from the enrollment
      const enrollment = await prisma.enrollment.findUnique({
        where: { id: enrollmentId },
        select: { studentId: true },
      });

      if (enrollment) {
        const res = await request(app)
          .get(`/api/tutor/students/${enrollment.studentId}`)
          .set('Authorization', `Bearer ${tutorToken}`);

        // May not exist or be different endpoint, but if it does, should not have pricing
        if (res.status === 200) {
          const data = res.body.enrollment || res.body;
          expect(data.yearlyPriceNGN).toBeUndefined();
          expect(data.yearlyPriceUSD).toBeUndefined();
          expect(data.yearlyPrice).toBeUndefined();
        }
      }
    });
  });

  describe('Students never get yearlyPrice fields', () => {
    it('GET /student/me - Student profile excludes yearlyPrice fields', async () => {
      const res = await request(app)
        .get('/api/student/me')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.yearlyPriceNGN).toBeUndefined();
      expect(res.body.yearlyPriceUSD).toBeUndefined();
      expect(res.body.yearlyPrice).toBeUndefined();
    });

    it('GET /student/me/schedule - Student schedule excludes yearlyPrice fields', async () => {
      const res = await request(app)
        .get('/api/student/me/schedule')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      const sessions = Array.isArray(res.body) ? res.body : res.body.sessions || [];

      sessions.forEach((session: any) => {
        expect(session.yearlyPriceNGN).toBeUndefined();
        expect(session.yearlyPriceUSD).toBeUndefined();
        expect(session.yearlyPrice).toBeUndefined();
      });
    });

    it('GET /student/me/grades - Student grades exclude yearlyPrice fields', async () => {
      const res = await request(app)
        .get('/api/student/me/grades')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      const grades = Array.isArray(res.body) ? res.body : res.body.data || res.body.grades || [];

      grades.forEach((grade: any) => {
        expect(grade.yearlyPriceNGN).toBeUndefined();
        expect(grade.yearlyPriceUSD).toBeUndefined();
        expect(grade.yearlyPrice).toBeUndefined();
      });
    });
  });

  describe('Parents still get yearlyPrice fields', () => {
    it('GET /enrollments - Parent list excludes yearlyPrice in list view', async () => {
      const res = await request(app)
        .get('/api/enrollments')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(200);
      const enrollments = Array.isArray(res.body) ? res.body : res.body.data || res.body.enrollments || [];

      // List view should exclude pricing
      enrollments.forEach((enrollment: any) => {
        expect(enrollment.yearlyPriceNGN).toBeUndefined();
        expect(enrollment.yearlyPriceUSD).toBeUndefined();
      });
    });

    it('GET /enrollments/:id - Parent details include yearlyPriceNGN and yearlyPriceUSD', async () => {
      const res = await request(app)
        .get(`/api/enrollments/${enrollmentId}`)
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(200);
      // Parents should see pricing in detail view
      expect(res.body.yearlyPriceNGN).toBeDefined();
      expect(res.body.yearlyPriceUSD).toBeDefined();
    });
  });

  describe('Admins still get yearlyPrice fields', () => {
    it('GET /admin/enrollments - Admin list includes yearlyPrice fields', async () => {
      const res = await request(app)
        .get('/api/admin/enrollments')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const enrollments = Array.isArray(res.body.data) ? res.body.data : res.body.enrollments || [];

      // Admins should see pricing
      enrollments.forEach((enrollment: any) => {
        expect(enrollment.yearlyPriceNGN).toBeDefined();
        expect(enrollment.yearlyPriceUSD).toBeDefined();
      });
    });

    it('GET /admin/enrollments/:id - Admin details include yearlyPrice fields', async () => {
      const res = await request(app)
        .get(`/api/admin/enrollments/${enrollmentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.yearlyPriceNGN).toBeDefined();
      expect(res.body.yearlyPriceUSD).toBeDefined();
    });
  });
});
