import prisma from '../../src/config/database';
import { runParentInactivityCheck } from '../../src/jobs/inactivity-check.job';
import { runAssignmentDueNotifications } from '../../src/jobs/assignment-due.job';
import { hashPassword } from '../../src/utils/password.util';

describe('Scheduled Background Jobs Integration Tests', () => {
  let inactiveParentId = '';
  let activeParentId = '';
  let testPassword = 'Password12345!';

  beforeAll(async () => {
    const passHash = await hashPassword(testPassword);
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);

    // 1. Inactive parent created 8 days ago with NO enrollments
    const inactiveParent = await prisma.user.create({
      data: {
        fullName: 'Inactive Parent',
        email: `inactive_${Date.now()}@test.com`,
        passwordHash: passHash,
        role: 'PARENT',
        status: 'ACTIVE',
        createdAt: eightDaysAgo,
      },
    });
    inactiveParentId = inactiveParent.id;

    // 2. Active parent created 8 days ago WITH an active enrollment
    const activeParent = await prisma.user.create({
      data: {
        fullName: 'Active Parent',
        email: `active_${Date.now()}@test.com`,
        passwordHash: passHash,
        role: 'PARENT',
        status: 'ACTIVE',
        createdAt: eightDaysAgo,
      },
    });
    activeParentId = activeParent.id;

    const studentUser = await prisma.user.create({
      data: {
        fullName: 'Active Child',
        studentCode: `JOB${Math.floor(1000 + Math.random() * 9000)}`,
        passwordHash: passHash,
        role: 'STUDENT',
        status: 'ACTIVE',
        parentId: activeParent.id,
      },
    });

    const student = await prisma.student.create({
      data: {
        parentId: activeParent.id,
        userId: studentUser.id,
        fullName: 'Active Child',
        dateOfBirth: new Date('2014-01-01'),
        gradeLevel: '3rd',
      },
    });

    const subject = await prisma.subject.create({
      data: {
        name: `Job_Subject_${Date.now()}`,
        gradeBand: 'K-12',
        category: 'CORE',
      },
    });

    const tutor = await prisma.user.create({
      data: {
        fullName: 'Job Tutor',
        email: `job_tutor_${Date.now()}@test.com`,
        passwordHash: passHash,
        role: 'TUTOR',
        status: 'APPROVED',
      },
    });

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId: student.id,
        subjectId: subject.id,
        tutorId: tutor.id,
        sessionFrequency: 'TWICE_WEEKLY',
        availableDays: ['MON', 'THU'],
        billingFrequency: 'MONTHLY',
        yearlyPrice: 1200,
        status: 'ACTIVE',
        startDate: new Date(),
      },
    });

    // Create an assignment due tomorrow
    await prisma.assignment.create({
      data: {
        enrollmentId: enrollment.id,
        createdBy: tutor.id,
        title: 'Scheduled Job Test Assignment',
        description: 'Testing 48h deadline alerts',
        type: 'ASSIGNMENT',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        status: 'PENDING',
      },
    });
  });

  it('runParentInactivityCheck should suspend inactive parent and keep enrolled parent active', async () => {
    await runParentInactivityCheck();

    const inactiveInDb = await prisma.user.findUnique({ where: { id: inactiveParentId } });
    expect(inactiveInDb?.status).toBe('SUSPENDED');

    const activeInDb = await prisma.user.findUnique({ where: { id: activeParentId } });
    expect(activeInDb?.status).toBe('ACTIVE');
  });

  it('runAssignmentDueNotifications should create notifications for due assignments without duplicates', async () => {
    const firstRun = await runAssignmentDueNotifications();
    expect(firstRun.notificationsCreated).toBeGreaterThanOrEqual(1);

    // Second run should be idempotent and not create duplicate notifications
    const secondRun = await runAssignmentDueNotifications();
    expect(secondRun.notificationsCreated).toBe(0);
  }, 30000);
});
