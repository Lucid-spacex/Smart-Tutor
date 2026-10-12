import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/config/database';
import { generateToken } from '../../src/utils/token.util';
import { hashPassword } from '../../src/utils/password.util';

describe('Per-Grade Subject Pricing', () => {
  let adminToken: string;
  let parentToken: string;
  let tutorToken: string;
  let adminId: string;
  let parentId: string;
  let tutorId: string;
  let studentId: string;
  let subjectId: string;

  beforeAll(async () => {
    // Create admin user
    const admin = await prisma.user.create({
      data: {
        fullName: 'Test Admin',
        email: 'admin@test.com',
        phone: '+1234567890',
        passwordHash: await hashPassword('admin123'),
        role: 'ADMIN',
        status: 'ACTIVE',
        timezone: 'UTC',
      },
    });
    adminId = admin.id;
    adminToken = generateToken(admin.id, admin.role);

    // Create parent user
    const parent = await prisma.user.create({
      data: {
        fullName: 'Test Parent',
        email: 'parent@test.com',
        phone: '+1234567891',
        passwordHash: await hashPassword('parent123'),
        role: 'PARENT',
        status: 'ACTIVE',
        timezone: 'America/New_York',
      },
    });
    parentId = parent.id;
    parentToken = generateToken(parent.id, parent.role);

    // Create tutor user
    const tutor = await prisma.user.create({
      data: {
        fullName: 'Test Tutor',
        email: 'tutor@test.com',
        phone: '+1234567892',
        passwordHash: await hashPassword('tutor123'),
        role: 'TUTOR',
        status: 'APPROVED',
        timezone: 'Africa/Lagos',
      },
    });
    tutorId = tutor.id;
    tutorToken = generateToken(tutor.id, tutor.role);

    // Create tutor profile
    await prisma.tutorProfile.create({
      data: {
        userId: tutorId,
        subjects: ['Mathematics'],
        bio: 'Test tutor',
        credentialsUrl: 'https://test.com',
        vettingStatus: 'APPROVED',
        hourlyRate: 50.00,
        availability: { monday: ['9:00-12:00'] },
      },
    });

    // Create student
    const studentUser = await prisma.user.create({
      data: {
        fullName: 'Test Student',
        studentCode: 'STU001',
        passwordHash: await hashPassword('student123'),
        role: 'STUDENT',
        status: 'ACTIVE',
        parentId,
      },
    });

    const student = await prisma.student.create({
      data: {
        parentId,
        userId: studentUser.id,
        fullName: 'Test Student',
        dateOfBirth: new Date('2012-05-15'),
        actualGrade: 'GRADE_5',
        gradeLevel: '5th Grade',
        gradeBandTier: 'G5_TO_G8',
        school: 'Test School',
      },
    });
    studentId = student.id;
  });

  afterAll(async () => {
    // Cleanup in correct order to respect foreign keys
    await prisma.enrollment.deleteMany({});
    await prisma.subjectPrice.deleteMany({});
    await prisma.subject.deleteMany({});
    await prisma.student.deleteMany({});
    await prisma.tutorProfile.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['admin@test.com', 'parent@test.com', 'tutor@test.com'],
        },
      },
    });
    await prisma.$disconnect();
  });

  describe('Admin Subject Management', () => {
    it('should create a subject with per-grade pricing', async () => {
      const response = await request(app)
        .post('/admin/subjects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Mathematics',
          description: 'Math curriculum',
          category: 'CORE',
          prices: [
            {
              gradeBandTier: 'G5_TO_G8',
              yearlyPriceNGN: 250000,
              yearlyPriceUSD: 300,
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Mathematics');
      expect(response.body.subjectPrices).toHaveLength(1);
      expect(response.body.subjectPrices[0].gradeBandTier).toBe('G5_TO_G8');
      expect(Number(response.body.subjectPrices[0].yearlyPriceNGN)).toBe(250000);
      expect(Number(response.body.subjectPrices[0].yearlyPriceUSD)).toBe(300);

      subjectId = response.body.id;
    });

    it('should get admin subjects with drift information', async () => {
      const response = await request(app)
        .get('/admin/subjects')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0].subjectPrices).toBeDefined();
      expect(response.body[0].subjectPrices[0].driftPercentage).toBeDefined();
    });

    it('should update subject metadata', async () => {
      const response = await request(app)
        .patch(`/admin/subjects/${subjectId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Updated math curriculum',
        });

      expect(response.status).toBe(200);
      expect(response.body.description).toBe('Updated math curriculum');
    });

    it('should upsert subject price for a grade band', async () => {
      const response = await request(app)
        .put(`/admin/subjects/${subjectId}/prices/G9_TO_G12`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          yearlyPriceNGN: 300000,
          yearlyPriceUSD: 400,
          note: 'Adjusted for high school',
        });

      expect(response.status).toBe(200);
      expect(response.body.gradeBandTier).toBe('G9_TO_G12');
      expect(Number(response.body.yearlyPriceNGN)).toBe(300000);
    });

    it('should soft delete subject with enrollments', async () => {
      // Create an enrollment first
      await prisma.enrollment.create({
        data: {
          studentId,
          subjectId,
          tutorId,
          sessionFrequency: 'TWICE_WEEKLY',
          availableDays: ['MON'],
          preferredStartHour: 15,
          preferredEndHour: 17,
          billingFrequency: 'MONTHLY',
          status: 'ACTIVE',
          startDate: new Date(),
        },
      });

      const response = await request(app)
        .delete(`/admin/subjects/${subjectId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.isActive).toBe(false);
      expect(response.body.message).toContain('soft-deleted');
    });
  });

  describe('Parent Pricing Quote', () => {
    beforeAll(async () => {
      // Create a new active subject for quote tests
      const subject = await prisma.subject.create({
        data: {
          name: 'Physics',
          description: 'Physics curriculum',
          category: 'CORE',
          isActive: true,
          subjectPrices: {
            create: {
              gradeBandTier: 'G5_TO_G8',
              yearlyPriceNGN: 200000,
              yearlyPriceUSD: 250,
              updatedBy: adminId,
              updater: {
                connect: { id: adminId },
              },
            },
          },
        },
      });
      subjectId = subject.id;
    });

    it('should get pricing quote for student subjects', async () => {
      const response = await request(app)
        .get('/pricing/quote')
        .set('Authorization', `Bearer ${parentToken}`)
        .query({
          studentId,
          subjectIds: subjectId,
        });

      expect(response.status).toBe(200);
      expect(response.body.studentId).toBe(studentId);
      expect(response.body.quotes).toHaveLength(1);
      expect(response.body.quotes[0].subjectName).toBe('Physics');
      expect(response.body.quotes[0].yearlyPriceNGN).toBe(200000);
      expect(response.body.quotes[0].source).toBe('subject_price');
      expect(response.body.totals.yearlyPriceNGN).toBe(200000);
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .get('/pricing/quote')
        .query({
          studentId,
          subjectIds: subjectId,
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 for missing parameters', async () => {
      const response = await request(app)
        .get('/pricing/quote')
        .set('Authorization', `Bearer ${parentToken}`)
        .query({
          studentId,
        });

      expect(response.status).toBe(400);
    });

    it('should return 403 for non-parent role', async () => {
      const response = await request(app)
        .get('/pricing/quote')
        .set('Authorization', `Bearer ${tutorToken}`)
        .query({
          studentId,
          subjectIds: subjectId,
        });

      expect(response.status).toBe(403);
    });
  });

  describe('Public Subjects Endpoint', () => {
    it('should get subjects with prices for parent', async () => {
      const response = await request(app)
        .get('/subjects')
        .set('Authorization', `Bearer ${parentToken}`)
        .query({ gradeBandTier: 'G5_TO_G8' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      const physics = response.body.find((s: any) => s.name === 'Physics');
      expect(physics).toBeDefined();
      expect(physics.subjectPrices).toBeDefined();
    });

    it('should get subjects without prices for student', async () => {
      const studentUser = await prisma.user.findUnique({
        where: { id: studentId },
      });
      const studentToken = generateToken(studentUser!.id, 'STUDENT');

      const response = await request(app)
        .get('/subjects')
        .set('Authorization', `Bearer ${studentToken}`)
        .query({ gradeBandTier: 'G5_TO_G8' });

      expect(response.status).toBe(200);
      const physics = response.body.find((s: any) => s.name === 'Physics');
      expect(physics).toBeDefined();
      expect(physics.subjectPrices).toBeUndefined();
    });
  });
});
