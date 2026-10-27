import crypto from 'crypto';
import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/config/database';
import { hashPassword } from '../../src/utils/password.util';

describe('Webhook Security & Idempotency Tests', () => {
  jest.setTimeout(30000);
  let parentId = '';
  let providerReference = '';
  let paymentId = '';
  const testPassword = 'Password12345!';
  const testSecretKey = 'test_secret_key_for_hmac_verification';

  beforeAll(async () => {
    // Set test secret key for HMAC verification
    process.env.PAYSTACK_SECRET_KEY = testSecretKey;

    const passHash = await hashPassword(testPassword);

    const parent = await prisma.user.create({
      data: {
        fullName: 'Webhook Test Parent',
        email: `webhook_parent_${Date.now()}@test.com`,
        passwordHash: passHash,
        role: 'PARENT',
        status: 'ACTIVE',
      },
    });
    parentId = parent.id;

    const studentUser = await prisma.user.create({
      data: {
        fullName: 'Webhook Test Student',
        studentCode: `WEB${Math.floor(1000 + Math.random() * 9000)}`,
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
        fullName: 'Webhook Test Student',
        dateOfBirth: new Date('2014-01-01'),
        gradeLevel: '4th',
        actualGrade: 'GRADE_4',
        gradeBandTier: 'G2_TO_G4',
      },
    });

    const subject = await prisma.subject.create({
      data: {
        name: `WebhookTest_Subject_${Date.now()}`,
        gradeBand: 'K-12',
        category: 'CORE',
      },
    });

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId: studentRecord.id,
        subjectId: subject.id,
        sessionFrequency: 'TWICE_WEEKLY',
        availableDays: ['MON', 'THU'],
        preferredStartHour: 15,
        preferredEndHour: 17,
        billingFrequency: 'MONTHLY',
        yearlyPriceNGN: 1200.00,
        yearlyPriceUSD: 1200.00,
        status: 'PENDING_PAYMENT',
        startDate: new Date(),
      },
    });

    providerReference = `webhook_test_ref_${Date.now()}`;
    const payment = await prisma.payment.create({
      data: {
        parentId,
        enrollmentId: enrollment.id,
        amount: 100,
        currency: 'NGN',
        provider: 'PAYSTACK',
        providerReference,
        status: 'PENDING',
      },
    });
    paymentId = payment.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.payment.deleteMany({ where: { providerReference } });
    await prisma.enrollment.deleteMany({ where: { student: { parentId } } });
    await prisma.student.deleteMany({ where: { parentId } });
    await prisma.user.deleteMany({ where: { id: parentId } });
  });

  /**
   * Helper function to generate valid HMAC-SHA512 signature
   */
  const generateSignature = (rawBody: string, secret: string): string => {
    return crypto
      .createHmac('sha512', secret)
      .update(rawBody, 'utf8')
      .digest('hex');
  };

  /**
   * Helper function to generate webhook payload
   */
  const generateWebhookPayload = (event: string, reference: string): any => {
    return {
      event,
      data: {
        reference,
        status: event === 'charge.success' ? 'success' : 'failed',
        amount: 10000, // in kobo
        currency: 'NGN',
      },
    };
  };

  describe('Canonical endpoint /api/webhooks/paystack', () => {
    it('accepts valid signature on /api/webhooks/paystack', async () => {
      const payload = generateWebhookPayload('charge.success', providerReference);
      const rawBody = JSON.stringify(payload);
      const signature = generateSignature(rawBody, testSecretKey);

      const res = await request(app)
        .post('/api/webhooks/paystack')
        .set('x-paystack-signature', signature)
        .set('Content-Type', 'application/json')
        .send(rawBody);

      expect(res.status).toBe(200);

      // Verify payment was updated
      const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
      expect(payment?.status).toBe('SUCCESS');
      expect(payment?.paidAt).not.toBeNull();
    });

    it('rejects invalid signature on /api/webhooks/paystack', async () => {
      const payload = generateWebhookPayload('charge.success', providerReference);
      const rawBody = JSON.stringify(payload);
      const invalidSignature = 'invalid_signature_12345';

      const res = await request(app)
        .post('/api/webhooks/paystack')
        .set('x-paystack-signature', invalidSignature)
        .set('Content-Type', 'application/json')
        .send(rawBody);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid webhook signature');
    });

    it('rejects missing signature on /api/webhooks/paystack', async () => {
      const payload = generateWebhookPayload('charge.success', providerReference);
      const rawBody = JSON.stringify(payload);

      const res = await request(app)
        .post('/api/webhooks/paystack')
        .set('Content-Type', 'application/json')
        .send(rawBody);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid webhook signature');
    });
  });

  describe('Alias endpoint /api/payments/webhook', () => {
    it('accepts valid signature on /api/payments/webhook', async () => {
      // Reset payment to PENDING for this test
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'PENDING', paidAt: null },
      });

      const payload = generateWebhookPayload('charge.success', providerReference);
      const rawBody = JSON.stringify(payload);
      const signature = generateSignature(rawBody, testSecretKey);

      const res = await request(app)
        .post('/api/payments/webhook')
        .set('x-paystack-signature', signature)
        .set('Content-Type', 'application/json')
        .send(rawBody);

      expect(res.status).toBe(200);

      // Verify payment was updated
      const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
      expect(payment?.status).toBe('SUCCESS');
    });

    it('rejects invalid signature on /api/payments/webhook', async () => {
      const payload = generateWebhookPayload('charge.success', providerReference);
      const rawBody = JSON.stringify(payload);
      const invalidSignature = 'invalid_signature_12345';

      const res = await request(app)
        .post('/api/payments/webhook')
        .set('x-paystack-signature', invalidSignature)
        .set('Content-Type', 'application/json')
        .send(rawBody);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid webhook signature');
    });
  });

  describe('Idempotency', () => {
    it('replayed event is idempotent on /api/webhooks/paystack', async () => {
      // Payment is already SUCCESS from previous test
      const paymentBefore = await prisma.payment.findUnique({ where: { id: paymentId } });
      expect(paymentBefore?.status).toBe('SUCCESS');

      const payload = generateWebhookPayload('charge.success', providerReference);
      const rawBody = JSON.stringify(payload);
      const signature = generateSignature(rawBody, testSecretKey);

      // Send the same webhook again
      const res = await request(app)
        .post('/api/webhooks/paystack')
        .set('x-paystack-signature', signature)
        .set('Content-Type', 'application/json')
        .send(rawBody);

      expect(res.status).toBe(200);

      // Verify payment state is unchanged
      const paymentAfter = await prisma.payment.findUnique({ where: { id: paymentId } });
      expect(paymentAfter?.status).toBe('SUCCESS');
      expect(paymentAfter?.paidAt?.toISOString()).toBe(paymentBefore?.paidAt?.toISOString());
    });

    it('replayed event is idempotent on /api/payments/webhook', async () => {
      const paymentBefore = await prisma.payment.findUnique({ where: { id: paymentId } });

      const payload = generateWebhookPayload('charge.success', providerReference);
      const rawBody = JSON.stringify(payload);
      const signature = generateSignature(rawBody, testSecretKey);

      // Send the same webhook again via alias
      const res = await request(app)
        .post('/api/payments/webhook')
        .set('x-paystack-signature', signature)
        .set('Content-Type', 'application/json')
        .send(rawBody);

      expect(res.status).toBe(200);

      // Verify payment state is unchanged
      const paymentAfter = await prisma.payment.findUnique({ where: { id: paymentId } });
      expect(paymentAfter?.status).toBe('SUCCESS');
      expect(paymentAfter?.paidAt?.toISOString()).toBe(paymentBefore?.paidAt?.toISOString());
    });

    it('prevents status reversal from SUCCESS to FAILED', async () => {
      // Create a new payment that is already SUCCESS
      const newReference = `reversal_test_${Date.now()}`;
      const newPayment = await prisma.payment.create({
        data: {
          parentId,
          amount: 100,
          currency: 'NGN',
          provider: 'PAYSTACK',
          providerReference: newReference,
          status: 'SUCCESS',
          paidAt: new Date(),
        },
      });

      const payload = generateWebhookPayload('charge.failed', newReference);
      const rawBody = JSON.stringify(payload);
      const signature = generateSignature(rawBody, testSecretKey);

      const res = await request(app)
        .post('/api/webhooks/paystack')
        .set('x-paystack-signature', signature)
        .set('Content-Type', 'application/json')
        .send(rawBody);

      expect(res.status).toBe(200);

      // Verify payment remains SUCCESS (not reversed to FAILED)
      const payment = await prisma.payment.findUnique({ where: { id: newPayment.id } });
      expect(payment?.status).toBe('SUCCESS');

      // Cleanup
      await prisma.payment.delete({ where: { id: newPayment.id } });
    });

    it('prevents status reversal from FAILED to SUCCESS', async () => {
      // Create a new payment that is already FAILED
      const newReference = `reversal_test2_${Date.now()}`;
      const newPayment = await prisma.payment.create({
        data: {
          parentId,
          amount: 100,
          currency: 'NGN',
          provider: 'PAYSTACK',
          providerReference: newReference,
          status: 'FAILED',
          paidAt: null,
        },
      });

      const payload = generateWebhookPayload('charge.success', newReference);
      const rawBody = JSON.stringify(payload);
      const signature = generateSignature(rawBody, testSecretKey);

      const res = await request(app)
        .post('/api/webhooks/paystack')
        .set('x-paystack-signature', signature)
        .set('Content-Type', 'application/json')
        .send(rawBody);

      expect(res.status).toBe(200);

      // Verify payment remains FAILED (not reversed to SUCCESS)
      const payment = await prisma.payment.findUnique({ where: { id: newPayment.id } });
      expect(payment?.status).toBe('FAILED');

      // Cleanup
      await prisma.payment.delete({ where: { id: newPayment.id } });
    });
  });

  describe('Rate Limiting Exemption', () => {
    it('100 rapid requests to /api/webhooks/paystack are never rate limited', async () => {
      const payload = generateWebhookPayload('charge.success', providerReference);
      const rawBody = JSON.stringify(payload);
      const signature = generateSignature(rawBody, testSecretKey);

      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          request(app)
            .post('/api/webhooks/paystack')
            .set('x-paystack-signature', signature)
            .set('Content-Type', 'application/json')
            .send(rawBody)
        );
      }

      const results = await Promise.all(promises);

      // All requests should succeed (no 429 rate limit errors)
      const successCount = results.filter(r => r.status === 200).length;
      const rateLimitCount = results.filter(r => r.status === 429).length;

      expect(rateLimitCount).toBe(0);
      expect(successCount).toBe(100);
    });

    it('100 rapid requests to /api/payments/webhook are never rate limited', async () => {
      const payload = generateWebhookPayload('charge.success', providerReference);
      const rawBody = JSON.stringify(payload);
      const signature = generateSignature(rawBody, testSecretKey);

      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          request(app)
            .post('/api/payments/webhook')
            .set('x-paystack-signature', signature)
            .set('Content-Type', 'application/json')
            .send(rawBody)
        );
      }

      const results = await Promise.all(promises);

      // All requests should succeed (no 429 rate limit errors)
      const successCount = results.filter(r => r.status === 200).length;
      const rateLimitCount = results.filter(r => r.status === 429).length;

      expect(rateLimitCount).toBe(0);
      expect(successCount).toBe(100);
    });
  });
});
