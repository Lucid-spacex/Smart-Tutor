import { randomUUID } from 'crypto';
import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/config/database';
import { hashPassword } from '../../src/utils/password.util';
import { PaymentsService } from '../../src/modules/payments/payments.service';

describe('Payments Security & Integrity Integration Tests', () => {
  jest.setTimeout(30000);
  let parentToken = '', parentId = '';
  let singleEnrollmentId = '';
  let groupEnrollmentGroupId = '';
  let studentRecord: any;
  let testPassword = 'Password12345!';
  const paymentsService = new PaymentsService();

  beforeAll(async () => {
    const passHash = await hashPassword(testPassword);

    const parent = await prisma.user.create({
      data: {
        fullName: 'Parent Payments',
        email: `pay_parent_${Date.now()}@test.com`,
        passwordHash: passHash,
        role: 'PARENT',
        status: 'ACTIVE',
      },
    });
    parentId = parent.id;

    const studentUser = await prisma.user.create({
      data: {
        fullName: 'Student Payments',
        studentCode: `PAY${Math.floor(1000 + Math.random() * 9000)}`,
        passwordHash: passHash,
        role: 'STUDENT',
        status: 'ACTIVE',
        parentId: parent.id,
      },
    });

    studentRecord = await prisma.student.create({
      data: {
        parentId: parent.id,
        userId: studentUser.id,
        fullName: 'Student Payments',
        dateOfBirth: new Date('2014-01-01'),
        gradeLevel: '4th',
        actualGrade: 'GRADE_4',
        gradeBandTier: 'G2_TO_G4',
      },
    });

    const subject1 = await prisma.subject.create({
      data: {
        name: `Math_Pay_${Date.now()}`,
        gradeBand: 'K-12',
        category: 'CORE',
      },
    });

    const subject2 = await prisma.subject.create({
      data: {
        name: `English_Pay_${Date.now()}`,
        gradeBand: 'K-12',
        category: 'CORE',
      },
    });

    // 1. Single Enrollment with yearlyPrice override = 1200 and billingFrequency = MONTHLY
    // -> computed amount should be 1200 / 12 = 100.00
    const singleEnrollment = await prisma.enrollment.create({
      data: {
        studentId: studentRecord.id,
        subjectId: subject1.id,
        sessionFrequency: 'TWICE_WEEKLY',
        availableDays: ['MON', 'THU'],
        preferredStartHour: 15,
        preferredEndHour: 17,
        billingFrequency: 'MONTHLY',
        yearlyPriceNGN: 1200.00,
        yearlyPriceUSD: 1200.00,
        status: 'PAUSED',
        startDate: new Date(),
      },
    });
    singleEnrollmentId = singleEnrollment.id;

    // 2. Batch Group Enrollments (2 subjects, $1200 and $600 yearlyPrice, MONTHLY)
    // -> $100/mo + $50/mo = $150/mo total
    const groupId = randomUUID();
    await prisma.enrollment.create({
      data: {
        enrollmentGroupId: groupId,
        studentId: studentRecord.id,
        subjectId: subject1.id,
        sessionFrequency: 'TWICE_WEEKLY',
        availableDays: ['MON', 'THU'],
        preferredStartHour: 15,
        preferredEndHour: 17,
        billingFrequency: 'MONTHLY',
        yearlyPriceNGN: 1200.00,
        yearlyPriceUSD: 1200.00,
        status: 'PAUSED', // Start inactive to test webhook activation
        startDate: new Date(),
      },
    });

    await prisma.enrollment.create({
      data: {
        enrollmentGroupId: groupId,
        studentId: studentRecord.id,
        subjectId: subject2.id,
        sessionFrequency: 'TWICE_WEEKLY',
        availableDays: ['MON', 'THU'],
        preferredStartHour: 15,
        preferredEndHour: 17,
        billingFrequency: 'MONTHLY',
        yearlyPriceNGN: 600.00,
        yearlyPriceUSD: 600.00,
        status: 'PAUSED', // Start inactive to test webhook activation
        startDate: new Date(),
      },
    });
    groupEnrollmentGroupId = groupId;

    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: parent.email, password: testPassword });
    parentToken = loginRes.body.accessToken;
  });

  it('POST /payments/initiate computes amount server-side from enrollment (ignoring client amount)', async () => {
    const res = await request(app)
      .post('/payments/initiate')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        enrollmentId: singleEnrollmentId,
        amount: 1.00, // Client tries to supply fraudulent $1 amount
        currency: 'USD',
      });

    expect(res.status).toBe(200);
    // Verified: computed amount is $100.00 (1200 / 12)
    expect(res.body.computedAmount).toBe(100);
    expect(res.body.displayAmountUSD).toBe(100);
    expect(Number(res.body.payment.amount)).toBe(100);
    expect(res.body.payment.enrollmentId).toBe(singleEnrollmentId);
    expect(res.body.payment.enrollmentGroupId).toBeNull();
  });

  it('POST /payments/initiate with enrollmentGroupId combines total for all subjects in the group', async () => {
    const res = await request(app)
      .post('/payments/initiate')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        enrollmentGroupId: groupEnrollmentGroupId,
        currency: 'USD',
      });

    expect(res.status).toBe(200);
    // Verified: $100 (subject1) + $50 (subject2) = $150
    expect(res.body.computedAmount).toBe(150);
    expect(res.body.displayAmountUSD).toBe(150);
    expect(Number(res.body.payment.amount)).toBe(150);
    expect(res.body.payment.enrollmentGroupId).toBe(groupEnrollmentGroupId);
    expect(res.body.payment.enrollmentId).toBeNull();
    expect(res.body.breakdown).toBeDefined();
    expect(res.body.breakdown.length).toBe(2);
  });

  it('POST /payments/initiate rejects request if neither enrollmentId nor enrollmentGroupId is provided', async () => {
    const res = await request(app)
      .post('/payments/initiate')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        currency: 'USD',
      });

    expect(res.status).toBe(400);
    expect(res.body.details.some((d: any) => d.message.includes('Provide either enrollmentId or enrollmentGroupId'))).toBe(true);
  });

  it('POST /payments/initiate rejects request if both enrollmentId and enrollmentGroupId are provided', async () => {
    const res = await request(app)
      .post('/payments/initiate')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        enrollmentId: singleEnrollmentId,
        enrollmentGroupId: groupEnrollmentGroupId,
        currency: 'USD',
      });

    expect(res.status).toBe(400);
    expect(res.body.details.some((d: any) => d.message.includes('not both'))).toBe(true);
  });

  it('POST /payments/initiate uses default pricing tier when no override is set', async () => {
    // Create an enrollment without pricing override to test tier fallback
    const testSubject = await prisma.subject.create({
      data: {
        name: `TierTest_Subject_${Date.now()}`,
        gradeBand: 'K-12',
        category: 'CORE',
      },
    });

    const tierTestEnrollment = await prisma.enrollment.create({
      data: {
        studentId: studentRecord.id,
        subjectId: testSubject.id,
        sessionFrequency: 'TWICE_WEEKLY',
        availableDays: ['MON', 'THU'],
        preferredStartHour: 15,
        preferredEndHour: 17,
        billingFrequency: 'YEARLY',
        // No yearlyPriceNGN or yearlyPriceUSD - should use tier default
        status: 'PAUSED',
        startDate: new Date(),
      },
    });

    const res = await request(app)
      .post('/payments/initiate')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        enrollmentId: tierTestEnrollment.id,
        currency: 'USD',
      });

    expect(res.status).toBe(200);
    // The student has gradeBandTier 'G2_TO_G4' which has default yearlyPriceUSD: 250
    expect(res.body.computedAmount).toBe(250);
    expect(res.body.displayAmountUSD).toBe(250);
  });

  it('Webhook success atomically activates all enrollments in an enrollment group', async () => {
    // 1. Create a group payment with reference
    const providerRef = `test_group_ref_${Date.now()}`;
    await prisma.payment.create({
      data: {
        parentId,
        enrollmentGroupId: groupEnrollmentGroupId,
        amount: 150,
        currency: 'NGN',
        provider: 'PAYSTACK',
        providerReference: providerRef,
        status: 'PENDING',
      },
    });

    // Mock webhook provider response
    const mockWebhookPayload = {
      event: 'charge.success',
      data: {
        reference: providerRef,
        status: 'success',
      },
    };

    // Spy on paymentProvider.processWebhook
    jest.spyOn((paymentsService as any).paymentProvider, 'processWebhook').mockResolvedValue({
      valid: true,
      reference: providerRef,
      status: 'success',
      amount: 150,
    });

    // Call processWebhook
    const updatedPayment = await paymentsService.processWebhook(mockWebhookPayload);
    expect(updatedPayment.status).toBe('SUCCESS');
    expect(updatedPayment.paidAt).not.toBeNull();

    // Verify that ALL enrollments in the group are now ACTIVE
    const enrollments = await prisma.enrollment.findMany({
      where: { enrollmentGroupId: groupEnrollmentGroupId },
    });

    expect(enrollments.length).toBe(2);
    for (const enr of enrollments) {
      expect(enr.status).toBe('ACTIVE');
    }
  });
});
