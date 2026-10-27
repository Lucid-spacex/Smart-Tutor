import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/config/database';
import { generateAccessToken } from '../../src/utils/token.util';
import { hashPassword } from '../../src/utils/password.util';

describe('Tutor Availability & Suggested Tutors', () => {
  let adminToken: string;
  let tutorToken: string;
  let adminId: string;
  let tutorId: string;
  let studentId: string;
  let subjectId: string;
  let enrollmentId: string;

  beforeAll(async () => {
    // Create admin user
    const admin = await prisma.user.create({
      data: {
        fullName: 'Test Admin',
        email: 'admin2@test.com',
        phone: '+1234567890',
        passwordHash: await hashPassword('admin123'),
        role: 'ADMIN',
        status: 'ACTIVE',
        timezone: 'UTC',
      },
    });
    adminId = admin.id;
    adminToken = generateAccessToken({ userId: admin.id, role: admin.role });

    // Create tutor user
    const tutor = await prisma.user.create({
      data: {
        fullName: 'Test Tutor',
        email: 'tutor2@test.com',
        phone: '+1234567892',
        passwordHash: await hashPassword('tutor123'),
        role: 'TUTOR',
        status: 'APPROVED',
        timezone: 'Africa/Lagos',
      },
    });
    tutorId = tutor.id;
    tutorToken = generateAccessToken({ userId: tutor.id, role: tutor.role });

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
        availabilityStatus: 'AVAILABLE',
        maxStudents: 10,
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

    // Link tutor to subject
    await prisma.tutorSubject.create({
      data: {
        tutorProfileId: (await prisma.tutorProfile.findUnique({ where: { userId: tutorId } }))!.id,
        subjectId,
      },
    });

    // Create parent and student
    const parent = await prisma.user.create({
      data: {
        fullName: 'Test Parent',
        email: 'parent2@test.com',
        phone: '+1234567891',
        passwordHash: await hashPassword('parent123'),
        role: 'PARENT',
        status: 'ACTIVE',
        timezone: 'America/New_York',
      },
    });

    const studentUser = await prisma.user.create({
      data: {
        fullName: 'Test Student',
        studentCode: 'STU002',
        passwordHash: await hashPassword('student123'),
        role: 'STUDENT',
        status: 'ACTIVE',
        parentId: parent.id,
      },
    });

    const student = await prisma.student.create({
      data: {
        parentId: parent.id,
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

    // Create enrollment without tutor
    const enrollment = await prisma.enrollment.create({
      data: {
        studentId,
        subjectId,
        sessionFrequency: 'TWICE_WEEKLY',
        availableDays: ['MON'],
        preferredStartHour: 15,
        preferredEndHour: 17,
        billingFrequency: 'MONTHLY',
        status: 'AWAITING_TUTOR',
        startDate: new Date(),
      },
    });
    enrollmentId = enrollment.id;
  });

  afterAll(async () => {
    // Cleanup in correct order
    await prisma.tutorSubject.deleteMany({});
    await prisma.enrollment.deleteMany({});
    await prisma.subjectPrice.deleteMany({});
    await prisma.subject.deleteMany({});
    await prisma.student.deleteMany({});
    await prisma.tutorProfile.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['admin2@test.com', 'parent2@test.com', 'tutor2@test.com'],
        },
      },
    });
    await prisma.$disconnect();
  });

  describe('Tutor Availability Management', () => {
    it('should update tutor availability status', async () => {
      const response = await request(app)
        .patch('/tutor-profile/availability-status')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          availabilityStatus: 'LIMITED',
          maxStudents: 5,
          statusNote: 'Taking fewer students this month',
        });

      expect(response.status).toBe(200);
      expect(response.body.availabilityStatus).toBe('LIMITED');
      expect(response.body.maxStudents).toBe(5);
      expect(response.body.statusNote).toBe('Taking fewer students this month');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .patch('/tutor-profile/availability-status')
        .send({
          availabilityStatus: 'UNAVAILABLE',
        });

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-tutor role', async () => {
      const response = await request(app)
        .patch('/tutor-profile/availability-status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          availabilityStatus: 'UNAVAILABLE',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('Admin Tutor Filtering', () => {
    it('should get tutors with availability filter', async () => {
      const response = await request(app)
        .get('/admin/tutors')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ availabilityStatus: 'LIMITED' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0].tutorProfile.availabilityStatus).toBe('LIMITED');
    });

    it('should get tutors with subject filter', async () => {
      const response = await request(app)
        .get('/admin/tutors')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ subjectId });

      expect(response.status).toBe(200);
      expect(response.body[0].tutorProfile.tutorSubjects).toBeDefined();
      expect(response.body[0].tutorProfile.tutorSubjects.length).toBeGreaterThan(0);
    });

    it('should get tutors with capacity filter', async () => {
      const response = await request(app)
        .get('/admin/tutors')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ hasCapacity: true });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should include current student count', async () => {
      const response = await request(app)
        .get('/admin/tutors')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body[0].currentStudentCount).toBeDefined();
      expect(typeof response.body[0].currentStudentCount).toBe('number');
    });
  });

  describe('Suggested Tutors', () => {
    it('should get suggested tutors for enrollment', async () => {
      const response = await request(app)
        .get(`/admin/enrollments/${enrollmentId}/suggested-tutors`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].tutorId).toBeDefined();
      expect(response.body[0].fullName).toBeDefined();
      expect(response.body[0].matchScore).toBeDefined();
      expect(response.body[0].subjects).toContain('Mathematics');
    });

    it('should rank tutors by match score', async () => {
      const response = await request(app)
        .get(`/admin/enrollments/${enrollmentId}/suggested-tutors`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      if (response.body.length > 1) {
        for (let i = 0; i < response.body.length - 1; i++) {
          expect(response.body[i].matchScore).toBeGreaterThanOrEqual(response.body[i + 1].matchScore);
        }
      }
    });

    it('should return 404 for non-existent enrollment', async () => {
      const response = await request(app)
        .get('/admin/enrollments/non-existent-id/suggested-tutors')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 403 for non-admin role', async () => {
      const response = await request(app)
        .get(`/admin/enrollments/${enrollmentId}/suggested-tutors`)
        .set('Authorization', `Bearer ${tutorToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Tutor Assignment with Capacity Check', () => {
    it('should assign tutor with capacity', async () => {
      const response = await request(app)
        .patch(`/admin/enrollments/${enrollmentId}/assign-tutor`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tutorId,
        });

      expect(response.status).toBe(200);
      expect(response.body.tutorId).toBe(tutorId);
    });

    it('should block assignment to UNAVAILABLE tutor without force', async () => {
      // Set tutor to unavailable
      await request(app)
        .patch('/tutor-profile/availability-status')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({
          availabilityStatus: 'UNAVAILABLE',
        });

      // Create new enrollment
      const newEnrollment = await prisma.enrollment.create({
        data: {
          studentId,
          subjectId,
          sessionFrequency: 'TWICE_WEEKLY',
          availableDays: ['MON'],
          preferredStartHour: 15,
          preferredEndHour: 17,
          billingFrequency: 'MONTHLY',
          status: 'AWAITING_TUTOR',
          startDate: new Date(),
        },
      });

      const response = await request(app)
        .patch(`/admin/enrollments/${newEnrollment.id}/assign-tutor`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tutorId,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('unavailable');

      // Clean up
      await prisma.enrollment.delete({ where: { id: newEnrollment.id } });
    });

    it('should allow assignment with force flag', async () => {
      const newEnrollment = await prisma.enrollment.create({
        data: {
          studentId,
          subjectId,
          sessionFrequency: 'TWICE_WEEKLY',
          availableDays: ['MON'],
          preferredStartHour: 15,
          preferredEndHour: 17,
          billingFrequency: 'MONTHLY',
          status: 'AWAITING_TUTOR',
          startDate: new Date(),
        },
      });

      const response = await request(app)
        .patch(`/admin/enrollments/${newEnrollment.id}/assign-tutor`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tutorId,
          force: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.tutorId).toBe(tutorId);

      // Clean up
      await prisma.enrollment.delete({ where: { id: newEnrollment.id } });
    });
  });
});
