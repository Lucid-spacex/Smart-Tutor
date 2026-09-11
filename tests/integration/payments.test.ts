import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/config/database';
import { hashPassword } from '../../src/utils/password.util';

describe('Payments Security & Integrity Integration Tests', () => {
  let parentToken = '', parentId = '';
  let enrollmentId = '';
  let testPassword = 'Password12345!';

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

    const studentRecord = await prisma.student.create({
      data: {
        parentId: parent.id,
        userId: studentUser.id,
        fullName: 'Student Payments',
        dateOfBirth: new Date('2014-01-01'),
        gradeLevel: '4th',
      },
    });

    const subject = await prisma.subject.create({
      data: {
        name: `Math_Pay_${Date.now()}`,
        gradeBand: 'K-12',
        category: 'CORE',
      },
    });

    // Enrollment with yearlyPrice = 1200 and billingFrequency = MONTHLY -> computed amount should be 1200 / 12 = 100.00
    const enrollment = await prisma.enrollment.create({
      data: {
        studentId: studentRecord.id,
        subjectId: subject.id,
        sessionFrequency: 'WEEKLY',
        billingFrequency: 'MONTHLY',
        yearlyPrice: 1200.00,
        status: 'ACTIVE',
        startDate: new Date(),
      },
    });
    enrollmentId = enrollment.id;

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
        enrollmentId,
        amount: 1.00, // Client tries to supply fraudulent $1 amount
        currency: 'USD',
      });

    expect(res.status).toBe(200);
    // Verified: computed amount is $100.00 (1200 / 12)
    expect(res.body.computedAmount).toBe(100);
    expect(res.body.payment.amount).toBe(100);
  });
});
