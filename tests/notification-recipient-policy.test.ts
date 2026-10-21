import request from 'supertest';
import app from '../src/app';
import { prisma } from './setup';
import bcrypt from 'bcrypt';

describe('Notification Recipient Policy', () => {
  let adminToken: string;
  let tutorToken: string;
  let parentToken: string;
  let studentToken: string;

  let adminId: string;
  let tutorId: string;
  let parentId: string;
  let studentId: string;

  beforeAll(async () => {
    // Clean up
    await prisma.notification.deleteMany();
    await prisma.user.deleteMany();

    const hashedPassword = await bcrypt.hash('password123', 10);

    // Admin (ACTIVE)
    const admin = await prisma.user.create({
      data: {
        fullName: 'Test Admin',
        email: 'admin@test.com',
        passwordHash: hashedPassword,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });
    adminId = admin.id;

    // Tutor (APPROVED)
    const tutor = await prisma.user.create({
      data: {
        fullName: 'Test Tutor',
        email: 'tutor@test.com',
        passwordHash: hashedPassword,
        role: 'TUTOR',
        status: 'APPROVED',
        tutorProfile: {
          create: {
            subjects: ['Math'],
            bio: 'Test bio',
            credentialsUrl: 'http://test.com',
            vettingStatus: 'APPROVED',
            hourlyRate: 50,
            availability: {},
          },
        },
      },
    });
    tutorId = tutor.id;

    // Parent (ACTIVE)
    const parent = await prisma.user.create({
      data: {
        fullName: 'Test Parent',
        email: 'parent@test.com',
        passwordHash: hashedPassword,
        role: 'PARENT',
        status: 'ACTIVE',
      },
    });
    parentId = parent.id;

    // Student (ACTIVE)
    const student = await prisma.user.create({
      data: {
        fullName: 'Test Student',
        email: 'student@test.com',
        passwordHash: hashedPassword,
        role: 'STUDENT',
        status: 'ACTIVE',
        parentId: parentId,
        studentCode: '123456',
      },
    });
    studentId = student.id;

    // Login
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@test.com',
      password: 'password123',
    });
    adminToken = adminLogin.body.accessToken;

    const tutorLogin = await request(app).post('/api/auth/login').send({
      email: 'tutor@test.com',
      password: 'password123',
    });
    tutorToken = tutorLogin.body.accessToken;

    const parentLogin = await request(app).post('/api/auth/login').send({
      email: 'parent@test.com',
      password: 'password123',
    });
    parentToken = parentLogin.body.accessToken;

    const studentLogin = await request(app).post('/api/auth/student-login').send({
      parentEmail: 'parent@test.com',
      studentCode: '123456',
      studentPin: 'password123',
    });
    studentToken = studentLogin.body.accessToken;
  });

  afterAll(async () => {
    await prisma.notification.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('Per-role status policy', () => {
    test('ADMIN with ACTIVE status receives notifications', async () => {
      const { NotificationCoreService } = require('../src/modules/notifications/notification-core.service');
      const notificationCore = new NotificationCoreService();

      await notificationCore.notify({
        recipientIds: [adminId],
        type: 'GENERAL',
        category: 'USERS',
        title: 'Test',
        body: 'Test notification',
      });

      const notifications = await prisma.notification.findMany({
        where: { userId: adminId },
      });
      expect(notifications.length).toBeGreaterThan(0);
    });

    test('ADMIN with SUSPENDED status does not receive notifications', async () => {
      // Suspend admin
      await prisma.user.update({
        where: { id: adminId },
        data: { status: 'SUSPENDED' },
      });

      const { NotificationCoreService } = require('../src/modules/notifications/notification-core.service');
      const notificationCore = new NotificationCoreService();

      await notificationCore.notify({
        recipientIds: [adminId],
        type: 'GENERAL',
        category: 'USERS',
        title: 'Test Admin Suspended',
        body: 'Test notification',
      });

      const notifications = await prisma.notification.findMany({
        where: { userId: adminId, title: 'Test Admin Suspended' },
      });
      expect(notifications.length).toBe(0);

      // Restore status
      await prisma.user.update({
        where: { id: adminId },
        data: { status: 'ACTIVE' },
      });
    });

    test('PARENT with ACTIVE status receives notifications', async () => {
      const { NotificationCoreService } = require('../src/modules/notifications/notification-core.service');
      const notificationCore = new NotificationCoreService();

      await notificationCore.notify({
        recipientIds: [parentId],
        type: 'GENERAL',
        category: 'USERS',
        title: 'Test Parent',
        body: 'Test notification',
      });

      const notifications = await prisma.notification.findMany({
        where: { userId: parentId, title: 'Test Parent' },
      });
      expect(notifications.length).toBeGreaterThan(0);
    });

    test('PARENT with SUSPENDED status does not receive notifications', async () => {
      // Suspend parent
      await prisma.user.update({
        where: { id: parentId },
        data: { status: 'SUSPENDED' },
      });

      const { NotificationCoreService } = require('../src/modules/notifications/notification-core.service');
      const notificationCore = new NotificationCoreService();

      await notificationCore.notify({
        recipientIds: [parentId],
        type: 'GENERAL',
        category: 'USERS',
        title: 'Test Parent 2',
        body: 'Test notification',
      });

      const notifications = await prisma.notification.findMany({
        where: { userId: parentId, title: 'Test Parent 2' },
      });
      expect(notifications.length).toBe(0);

      // Restore status
      await prisma.user.update({
        where: { id: parentId },
        data: { status: 'ACTIVE' },
      });
    });

    test('STUDENT with ACTIVE status receives notifications', async () => {
      const { NotificationCoreService } = require('../src/modules/notifications/notification-core.service');
      const notificationCore = new NotificationCoreService();

      await notificationCore.notify({
        recipientIds: [studentId],
        type: 'GENERAL',
        category: 'USERS',
        title: 'Test Student',
        body: 'Test notification',
      });

      const notifications = await prisma.notification.findMany({
        where: { userId: studentId, title: 'Test Student' },
      });
      expect(notifications.length).toBeGreaterThan(0);
    });

    test('STUDENT with SUSPENDED status does not receive notifications', async () => {
      // Suspend student
      await prisma.user.update({
        where: { id: studentId },
        data: { status: 'SUSPENDED' },
      });

      const { NotificationCoreService } = require('../src/modules/notifications/notification-core.service');
      const notificationCore = new NotificationCoreService();

      await notificationCore.notify({
        recipientIds: [studentId],
        type: 'GENERAL',
        category: 'USERS',
        title: 'Test Student 2',
        body: 'Test notification',
      });

      const notifications = await prisma.notification.findMany({
        where: { userId: studentId, title: 'Test Student 2' },
      });
      expect(notifications.length).toBe(0);

      // Restore status
      await prisma.user.update({
        where: { id: studentId },
        data: { status: 'ACTIVE' },
      });
    });

    test('TUTOR with APPROVED status receives normal notifications', async () => {
      const { NotificationCoreService } = require('../src/modules/notifications/notification-core.service');
      const notificationCore = new NotificationCoreService();

      await notificationCore.notify({
        recipientIds: [tutorId],
        type: 'SESSION_REMINDER',
        category: 'SCHEDULE',
        title: 'Test Tutor',
        body: 'Test notification',
      });

      const notifications = await prisma.notification.findMany({
        where: { userId: tutorId, title: 'Test Tutor' },
      });
      expect(notifications.length).toBeGreaterThan(0);
    });

    test('TUTOR with PENDING_VETTING status receives their own application notifications', async () => {
      // Change tutor to PENDING_VETTING
      await prisma.user.update({
        where: { id: tutorId },
        data: { status: 'PENDING_VETTING' },
      });

      const { NotificationCoreService } = require('../src/modules/notifications/notification-core.service');
      const notificationCore = new NotificationCoreService();

      await notificationCore.notify({
        recipientIds: [tutorId],
        type: 'GENERAL',
        category: 'USERS',
        title: 'Application Submitted',
        body: 'Your application has been submitted',
        isTutorApplicationNotification: true,
      });

      const notifications = await prisma.notification.findMany({
        where: { userId: tutorId, title: 'Application Submitted' },
      });
      expect(notifications.length).toBeGreaterThan(0);

      // Restore status
      await prisma.user.update({
        where: { id: tutorId },
        data: { status: 'APPROVED' },
      });
    });

    test('TUTOR with PENDING_VETTING status does NOT receive normal tutoring notifications', async () => {
      // Change tutor to PENDING_VETTING
      await prisma.user.update({
        where: { id: tutorId },
        data: { status: 'PENDING_VETTING' },
      });

      const { NotificationCoreService } = require('../src/modules/notifications/notification-core.service');
      const notificationCore = new NotificationCoreService();

      await notificationCore.notify({
        recipientIds: [tutorId],
        type: 'SESSION_REMINDER',
        category: 'SCHEDULE',
        title: 'Test Tutor 2',
        body: 'Test notification',
      });

      const notifications = await prisma.notification.findMany({
        where: { userId: tutorId, title: 'Test Tutor 2' },
      });
      expect(notifications.length).toBe(0);

      // Restore status
      await prisma.user.update({
        where: { id: tutorId },
        data: { status: 'APPROVED' },
      });
    });

    test('TUTOR with REJECTED status receives their own application notifications', async () => {
      // Change tutor to REJECTED
      await prisma.user.update({
        where: { id: tutorId },
        data: { status: 'REJECTED' },
      });

      const { NotificationCoreService } = require('../src/modules/notifications/notification-core.service');
      const notificationCore = new NotificationCoreService();

      await notificationCore.notify({
        recipientIds: [tutorId],
        type: 'GENERAL',
        category: 'USERS',
        title: 'Application Rejected',
        body: 'Your application was rejected',
        isTutorApplicationNotification: true,
      });

      const notifications = await prisma.notification.findMany({
        where: { userId: tutorId, title: 'Application Rejected' },
      });
      expect(notifications.length).toBeGreaterThan(0);

      // Restore status
      await prisma.user.update({
        where: { id: tutorId },
        data: { status: 'APPROVED' },
      });
    });

    test('TUTOR with REJECTED status does NOT receive normal tutoring notifications', async () => {
      // Change tutor to REJECTED
      await prisma.user.update({
        where: { id: tutorId },
        data: { status: 'REJECTED' },
      });

      const { NotificationCoreService } = require('../src/modules/notifications/notification-core.service');
      const notificationCore = new NotificationCoreService();

      await notificationCore.notify({
        recipientIds: [tutorId],
        type: 'SESSION_REMINDER',
        category: 'SCHEDULE',
        title: 'Test Tutor 3',
        body: 'Test notification',
      });

      const notifications = await prisma.notification.findMany({
        where: { userId: tutorId, title: 'Test Tutor 3' },
      });
      expect(notifications.length).toBe(0);

      // Restore status
      await prisma.user.update({
        where: { id: tutorId },
        data: { status: 'APPROVED' },
      });
    });

    test('TUTOR with SUSPENDED status does NOT receive any notifications', async () => {
      // Change tutor to SUSPENDED
      await prisma.user.update({
        where: { id: tutorId },
        data: { status: 'SUSPENDED' },
      });

      const { NotificationCoreService } = require('../src/modules/notifications/notification-core.service');
      const notificationCore = new NotificationCoreService();

      // Try normal notification
      await notificationCore.notify({
        recipientIds: [tutorId],
        type: 'SESSION_REMINDER',
        category: 'SCHEDULE',
        title: 'Test Tutor 4',
        body: 'Test notification',
      });

      // Try application notification
      await notificationCore.notify({
        recipientIds: [tutorId],
        type: 'GENERAL',
        category: 'USERS',
        title: 'Application Submitted 2',
        body: 'Your application has been submitted',
        isTutorApplicationNotification: true,
      });

      const notifications = await prisma.notification.findMany({
        where: { userId: tutorId, title: { in: ['Test Tutor 4', 'Application Submitted 2'] } },
      });
      expect(notifications.length).toBe(0);

      // Restore status
      await prisma.user.update({
        where: { id: tutorId },
        data: { status: 'APPROVED' },
      });
    });

    test('TUTOR with UNVERIFIED status does NOT receive any notifications', async () => {
      // Change tutor to UNVERIFIED
      await prisma.user.update({
        where: { id: tutorId },
        data: { status: 'UNVERIFIED' },
      });

      const { NotificationCoreService } = require('../src/modules/notifications/notification-core.service');
      const notificationCore = new NotificationCoreService();

      // Try normal notification
      await notificationCore.notify({
        recipientIds: [tutorId],
        type: 'SESSION_REMINDER',
        category: 'SCHEDULE',
        title: 'Test Tutor 5',
        body: 'Test notification',
      });

      // Try application notification
      await notificationCore.notify({
        recipientIds: [tutorId],
        type: 'GENERAL',
        category: 'USERS',
        title: 'Application Submitted 3',
        body: 'Your application has been submitted',
        isTutorApplicationNotification: true,
      });

      const notifications = await prisma.notification.findMany({
        where: { userId: tutorId, title: { in: ['Test Tutor 5', 'Application Submitted 3'] } },
      });
      expect(notifications.length).toBe(0);

      // Restore status
      await prisma.user.update({
        where: { id: tutorId },
        data: { status: 'APPROVED' },
      });
    });
  });
});
