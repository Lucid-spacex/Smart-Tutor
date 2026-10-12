import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/config/database';
import { generateToken } from '../../src/utils/token.util';
import { hashPassword } from '../../src/utils/password.util';

describe('Admin Transaction Management', () => {
  let adminToken: string;
  let parentToken: string;
  let adminId: string;
  let parentId: string;
  let studentId: string;
  let subjectId: string;
  let enrollmentId: string;
  let paymentId: string;

  beforeAll(async () => {
    // Create admin user
    const admin = await prisma.user.create({
      data: {
        fullName: 'Test Admin',
        email: 'admin4@test.com',
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
        email: 'parent4@test.com',
        phone: '+1234567891',
        passwordHash: await hashPassword('parent123'),
        role: 'PARENT',
        status: 'ACTIVE',
        timezone: 'America/New_York',
      },
    });
    parentId = parent.id;
    parentToken = generateToken(parent.id, parent.role);

    // Create tutor
    const tutor = await prisma.user.create({
      data: {
        fullName: 'Test Tutor',
        email: 'tutor4@test.com',
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
        studentCode: 'STU004',
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

    // Create exchange rate for NGN conversion
    await prisma.exchangeRate.create({
      data: {
        fromCurrency: 'USD',
        toCurrency: 'NGN',
        rate: 1500,
        fetchedAt: new Date(),
      },
    });

    // Create multiple payments
    const payment1 = await prisma.payment.create({
      data: {
        parentId,
        enrollmentId,
        amount: 100.00,
        currency: 'USD',
        provider: 'PAYSTACK',
        providerReference: 'test_ref_001',
        status: 'SUCCESS',
        paidAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
    });

    const payment2 = await prisma.payment.create({
      data: {
        parentId,
        enrollmentId,
        amount: 50000,
        currency: 'NGN',
        provider: 'PAYSTACK',
        providerReference: 'test_ref_002',
        status: 'SUCCESS',
        paidAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      },
    });

    const payment3 = await prisma.payment.create({
      data: {
        parentId,
        enrollmentId,
        amount: 150.00,
        currency: 'USD',
        provider: 'PAYSTACK',
        providerReference: 'test_ref_003',
        status: 'PENDING',
      },
    });

    paymentId = payment1.id;
  });

  afterAll(async () => {
    // Cleanup in correct order
    await prisma.payment.deleteMany({});
    await prisma.exchangeRate.deleteMany({});
    await prisma.enrollment.deleteMany({});
    await prisma.subjectPrice.deleteMany({});
    await prisma.subject.deleteMany({});
    await prisma.student.deleteMany({});
    await prisma.tutorProfile.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['admin4@test.com', 'parent4@test.com', 'tutor4@test.com'],
        },
      },
    });
    await prisma.$disconnect();
  });

  describe('Payment List', () => {
    it('should get paginated payment list', async () => {
      const response = await request(app)
        .get('/admin/payments')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(20);
      expect(response.body.total).toBeGreaterThan(0);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter payments by status', async () => {
      const response = await request(app)
        .get('/admin/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ status: 'SUCCESS' });

      expect(response.status).toBe(200);
      expect(response.body.data.every((p: any) => p.status === 'SUCCESS')).toBe(true);
    });

    it('should filter payments by currency', async () => {
      const response = await request(app)
        .get('/admin/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ currency: 'USD' });

      expect(response.status).toBe(200);
      expect(response.body.data.every((p: any) => p.currency === 'USD')).toBe(true);
    });

    it('should filter payments by provider', async () => {
      const response = await request(app)
        .get('/admin/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ provider: 'PAYSTACK' });

      expect(response.status).toBe(200);
      expect(response.body.data.every((p: any) => p.provider === 'PAYSTACK')).toBe(true);
    });

    it('should filter payments by parent', async () => {
      const response = await request(app)
        .get('/admin/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ parentId });

      expect(response.status).toBe(200);
      expect(response.body.data.every((p: any) => p.parentId === parentId)).toBe(true);
    });

    it('should filter payments by date range', async () => {
      const fromDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const toDate = new Date().toISOString();

      const response = await request(app)
        .get('/admin/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ from: fromDate, to: toDate });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should search payments by reference or parent name', async () => {
      const response = await request(app)
        .get('/admin/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: 'test_ref' });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should include NGN equivalent for USD payments', async () => {
      const response = await request(app)
        .get('/admin/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ currency: 'USD' });

      expect(response.status).toBe(200);
      const usdPayment = response.body.data.find((p: any) => p.currency === 'USD');
      expect(usdPayment).toBeDefined();
      expect(usdPayment.chargedAmountNGN).toBeDefined();
      expect(usdPayment.chargedAmountNGN).toBeGreaterThan(0);
    });

    it('should return 403 for non-admin role', async () => {
      const response = await request(app)
        .get('/admin/payments')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Payment Detail', () => {
    it('should get payment details by ID', async () => {
      const response = await request(app)
        .get(`/admin/payments/${paymentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(paymentId);
      expect(response.body.amount).toBeDefined();
      expect(response.body.currency).toBeDefined();
      expect(response.body.status).toBeDefined();
    });

    it('should include timeline', async () => {
      const response = await request(app)
        .get(`/admin/payments/${paymentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.timeline).toBeDefined();
      expect(Array.isArray(response.body.timeline)).toBe(true);
      expect(response.body.timeline[0].event).toBe('Initiated');
    });

    it('should include enrollment info', async () => {
      const response = await request(app)
        .get(`/admin/payments/${paymentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.enrollment).toBeDefined();
      expect(response.body.enrollment.student).toBeDefined();
      expect(response.body.enrollment.subject).toBeDefined();
    });

    it('should include NGN equivalent for USD payments', async () => {
      const response = await request(app)
        .get(`/admin/payments/${paymentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.chargedAmountNGN).toBeDefined();
      expect(response.body.chargedAmountNGN).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent payment', async () => {
      const response = await request(app)
        .get('/admin/payments/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 403 for non-admin role', async () => {
      const response = await request(app)
        .get(`/admin/payments/${paymentId}`)
        .set('Authorization', `Bearer ${parentToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Payment Summary', () => {
    it('should get payment summary', async () => {
      const response = await request(app)
        .get('/admin/payments/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.totalRevenue).toBeDefined();
      expect(response.body.revenueByCurrency).toBeDefined();
      expect(response.body.countsByStatus).toBeDefined();
      expect(response.body.successRate).toBeDefined();
      expect(response.body.revenuePerDay).toBeDefined();
    });

    it('should filter summary by date range', async () => {
      const fromDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const toDate = new Date().toISOString();

      const response = await request(app)
        .get('/admin/payments/summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ from: fromDate, to: toDate });

      expect(response.status).toBe(200);
      expect(response.body.totalRevenue).toBeDefined();
    });

    it('should include revenue breakdown by currency', async () => {
      const response = await request(app)
        .get('/admin/payments/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.revenueByCurrency)).toBe(true);
      expect(response.body.revenueByCurrency[0].currency).toBeDefined();
      expect(response.body.revenueByCurrency[0].amount).toBeDefined();
    });

    it('should include counts by status', async () => {
      const response = await request(app)
        .get('/admin/payments/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.countsByStatus)).toBe(true);
      expect(response.body.countsByStatus[0].status).toBeDefined();
      expect(response.body.countsByStatus[0].count).toBeDefined();
    });

    it('should include revenue per day chart', async () => {
      const response = await request(app)
        .get('/admin/payments/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.revenuePerDay)).toBe(true);
      if (response.body.revenuePerDay.length > 0) {
        expect(response.body.revenuePerDay[0].date).toBeDefined();
        expect(response.body.revenuePerDay[0].amount).toBeDefined();
      }
    });

    it('should return 403 for non-admin role', async () => {
      const response = await request(app)
        .get('/admin/payments/summary')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(response.status).toBe(403);
    });
  });
});
