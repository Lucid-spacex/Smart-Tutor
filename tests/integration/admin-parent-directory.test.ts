import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/config/database';
import { generateAccessToken } from '../../src/utils/token.util';
import { hashPassword } from '../../src/utils/password.util';

describe('Admin Parent Directory', () => {
  let adminToken: string;
  let parentToken: string;
  let adminId: string;
  let parentId: string;
  let studentId: string;
  let subjectId: string;
  let enrollmentId: string;

  beforeAll(async () => {
    // Create admin user
    const admin = await prisma.user.create({
      data: {
        fullName: 'Test Admin',
        email: 'admin3@test.com',
        phone: '+1234567890',
        passwordHash: await hashPassword('admin123'),
        role: 'ADMIN',
        status: 'ACTIVE',
        timezone: 'UTC',
      },
    });
    adminId = admin.id;
    adminToken = generateAccessToken({ userId: admin.id, role: admin.role });

    // Create parent user
    const parent = await prisma.user.create({
      data: {
        fullName: 'Test Parent',
        email: 'parent3@test.com',
        phone: '+1234567891',
        passwordHash: await hashPassword('parent123'),
        role: 'PARENT',
        status: 'ACTIVE',
        timezone: 'America/New_York',
      },
    });
    parentId = parent.id;
    parentToken = generateAccessToken({ userId: parent.id, role: parent.role });

    // Create tutor
    const tutor = await prisma.user.create({
      data: {
        fullName: 'Test Tutor',
        email: 'tutor3@test.com',
        phone: '+1234567892',
        passwordHash: await hashPassword('tutor123'),
        role: 'TUTOR',
        status: 'APPROVED',
        timezone: 'Africa/Lagos',
      },
    });

    await prisma.tutorProfile.create({
      data: {
        userId: tutor.id,
        subjects: ['Mathematics'],
        bio: 'Test tutor',
        credentialsUrl: 'https://test.com',
        vettingStatus: 'APPROVED',
        hourlyRate: 50.00,
        availability: { monday: ['9:00-12:00'] },
      },
    });

    // Create subject
    const subject = await prisma.subject.create({
      data: {
        name: 'Mathematics',
        description: 'Math curriculum',
        category: 'CORE',
        isActive: true,
        subjectPrices: {
          create: {
            gradeBandTier: 'G5_TO_G8',
            yearlyPriceNGN: 250000,
            yearlyPriceUSD: 300,
            updatedBy: adminId,
            updater: {
              connect: { id: adminId },
            },
          },
        },
      },
    });
    subjectId = subject.id;

    // Create student
    const studentUser = await prisma.user.create({
      data: {
        fullName: 'Test Student',
        studentCode: 'STU003',
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

    // Create enrollment
    const enrollment = await prisma.enrollment.create({
      data: {
        studentId,
        subjectId,
        tutorId: tutor.id,
        sessionFrequency: 'TWICE_WEEKLY',
        availableDays: ['MON'],
        preferredStartHour: 15,
        preferredEndHour: 17,
        billingFrequency: 'MONTHLY',
        status: 'ACTIVE',
        startDate: new Date(),
      },
    });
    enrollmentId = enrollment.id;

    // Create payment
    await prisma.payment.create({
      data: {
        parentId,
        enrollmentId,
        amount: 100.00,
        currency: 'USD',
        provider: 'PAYSTACK',
        providerReference: 'test_ref_123',
        status: 'SUCCESS',
        paidAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    // Cleanup in correct order
    await prisma.payment.deleteMany({});
    await prisma.enrollment.deleteMany({});
    await prisma.subjectPrice.deleteMany({});
    await prisma.subject.deleteMany({});
    await prisma.student.deleteMany({});
    await prisma.tutorProfile.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['admin3@test.com', 'parent3@test.com', 'tutor3@test.com'],
        },
      },
    });
    await prisma.$disconnect();
  });

  describe('Parent List', () => {
    it('should get paginated parent list', async () => {
      const response = await request(app)
        .get('/admin/parents')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(20);
      expect(response.body.total).toBeGreaterThan(0);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should search parents by name', async () => {
      const response = await request(app)
        .get('/admin/parents')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: 'Test Parent' });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].fullName).toContain('Test Parent');
    });

    it('should filter parents by status', async () => {
      const response = await request(app)
        .get('/admin/parents')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ status: 'ACTIVE' });

      expect(response.status).toBe(200);
      expect(response.body.data.every((p: any) => p.status === 'ACTIVE')).toBe(true);
    });

    it('should include parent metrics', async () => {
      const response = await request(app)
        .get('/admin/parents')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const parent = response.body.data.find((p: any) => p.id === parentId);
      expect(parent).toBeDefined();
      expect(parent.childrenCount).toBeDefined();
      expect(parent.activeEnrollments).toBeDefined();
      expect(parent.pendingPaymentCount).toBeDefined();
      expect(parent.totalPaidNGN).toBeDefined();
      expect(parent.totalPaidUSD).toBeDefined();
    });

    it('should return 403 for non-admin role', async () => {
      const response = await request(app)
        .get('/admin/parents')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Parent Detail', () => {
    it('should get parent details by ID', async () => {
      const response = await request(app)
        .get(`/admin/parents/${parentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(parentId);
      expect(response.body.fullName).toBe('Test Parent');
      expect(response.body.email).toBe('parent3@test.com');
    });

    it('should include children with enrollments', async () => {
      const response = await request(app)
        .get(`/admin/parents/${parentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.children).toBeDefined();
      expect(Array.isArray(response.body.children)).toBe(true);
      expect(response.body.children.length).toBeGreaterThan(0);
      expect(response.body.children[0].enrollments).toBeDefined();
    });

    it('should include effective pricing in enrollments', async () => {
      const response = await request(app)
        .get(`/admin/parents/${parentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const enrollment = response.body.children[0].enrollments[0];
      expect(enrollment.effectivePriceNGN).toBeDefined();
      expect(enrollment.effectivePriceUSD).toBeDefined();
      expect(enrollment.priceSource).toBeDefined();
      expect(['override', 'subject_price']).toContain(enrollment.priceSource);
    });

    it('should include recent payments', async () => {
      const response = await request(app)
        .get(`/admin/parents/${parentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.recentPayments).toBeDefined();
      expect(Array.isArray(response.body.recentPayments)).toBe(true);
    });

    it('should include complaint count', async () => {
      const response = await request(app)
        .get(`/admin/parents/${parentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.complaintCount).toBeDefined();
      expect(typeof response.body.complaintCount).toBe('number');
    });

    it('should return 404 for non-existent parent', async () => {
      const response = await request(app)
        .get('/admin/parents/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 403 for non-admin role', async () => {
      const response = await request(app)
        .get(`/admin/parents/${parentId}`)
        .set('Authorization', `Bearer ${parentToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Enrollment Pricing Override', () => {
    it('should set enrollment pricing override', async () => {
      const response = await request(app)
        .patch(`/admin/enrollments/${enrollmentId}/pricing`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          yearlyPriceNGN: 275000,
          yearlyPriceUSD: 325,
          note: 'Custom pricing for this student',
        });

      expect(response.status).toBe(200);
      expect(Number(response.body.yearlyPriceNGN)).toBe(275000);
      expect(Number(response.body.yearlyPriceUSD)).toBe(325);
    });

    it('should clear enrollment pricing override', async () => {
      const response = await request(app)
        .patch(`/admin/enrollments/${enrollmentId}/pricing`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          yearlyPriceNGN: null,
          yearlyPriceUSD: null,
        });

      expect(response.status).toBe(200);
      expect(response.body.yearlyPriceNGN).toBeNull();
      expect(response.body.yearlyPriceUSD).toBeNull();
    });

    it('should log price changes', async () => {
      // Set a price
      await request(app)
        .patch(`/admin/enrollments/${enrollmentId}/pricing`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          yearlyPriceNGN: 280000,
          yearlyPriceUSD: 330,
        });

      // Check price change log
      const priceChangeLogs = await prisma.priceChangeLog.findMany({
        where: {
          targetType: 'ENROLLMENT',
          targetId: enrollmentId,
        },
      });

      expect(priceChangeLogs.length).toBeGreaterThan(0);
      expect(priceChangeLogs[0].changedBy).toBe(adminId);
    });
  });
});
