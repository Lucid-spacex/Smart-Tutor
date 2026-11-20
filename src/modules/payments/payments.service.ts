import prisma from '../../config/database';
import { logger } from '../../config/logger';
import { PaystackProvider } from './providers/paystack.provider';
import { PaymentProvider } from './providers/payment-provider.interface';
import { InitiatePaymentInput } from './payments.validation';
import { AppError } from '../../middleware/error-handler.middleware';
import { SubjectsService } from '../subjects/subjects.service';
import { NotificationCoreService } from '../notifications/notification-core.service';
import { NotificationCategory, NotificationType } from '@prisma/client';

export class PaymentsService {
  private paymentProvider: PaymentProvider;
  private subjectsService: SubjectsService;
  private notificationCore: NotificationCoreService;

  constructor() {
    this.paymentProvider = new PaystackProvider();
    this.subjectsService = new SubjectsService();
    this.notificationCore = new NotificationCoreService();
  }

  /**
   * Generate a unique receipt number in format RCT-YYYYMM-000123
   * Uses a sequential counter per month
   */
  private async generateReceiptNumber(tx: any, paidAt: Date): Promise<string> {
    const yearMonth = paidAt.toISOString().slice(0, 7).replace('-', ''); // YYYYMM

    // Find the highest receipt number for this month
    const lastPayment = await tx.payment.findFirst({
      where: {
        receiptNumber: {
          startsWith: `RCT-${yearMonth}-`,
        },
      },
      orderBy: {
        receiptNumber: 'desc',
      },
      select: {
        receiptNumber: true,
      },
    });

    let nextSequence = 1;
    if (lastPayment && lastPayment.receiptNumber) {
      const lastSequence = parseInt(lastPayment.receiptNumber.split('-')[2], 10);
      nextSequence = lastSequence + 1;
    }

    // Format: RCT-YYYYMM-000123 (6-digit sequence)
    return `RCT-${yearMonth}-${String(nextSequence).padStart(6, '0')}`;
  }

  /**
   * Get current exchange rate for NGN per USD
   * This is a placeholder - in production, integrate with a real exchange rate API
   */
  private async getExchangeRate(currency: string): Promise<number | null> {
    if (currency === 'NGN') {
      return 1; // NGN to NGN is 1:1
    }
    if (currency === 'USD') {
      // Placeholder: use a fixed rate or fetch from external API
      // For now, returning a reasonable default
      return 1500; // NGN per USD (placeholder)
    }
    return null;
  }

  async initiatePayment(parentId: string, data: InitiatePaymentInput) {
    // -------------------------------------------------------------------------
    // Path A: Group Payment (data.enrollmentGroupId provided)
    // -------------------------------------------------------------------------
    if (data.enrollmentGroupId) {
      const enrollments = await prisma.enrollment.findMany({
        where: { enrollmentGroupId: data.enrollmentGroupId },
        include: {
          student: {
            include: {
              user: true,
            },
          },
          subject: true,
        },
      });

      if (!enrollments || enrollments.length === 0) {
        throw new AppError(404, 'Enrollment group not found');
      }

      // Verify all enrollments belong to the requesting parent
      const unauthorized = enrollments.find((e) => e.student.parentId !== parentId);
      if (unauthorized) {
        throw new AppError(403, 'Not authorized to make payment for this enrollment group');
      }

      let totalComputedAmountNGN = 0;
      let totalComputedAmountUSD = 0;
      const breakdown: Array<{
        enrollmentId: string;
        subjectName: string;
        billingFrequency: string;
        amountNGN: number;
        amountUSD: number;
      }> = [];

      for (const enrollment of enrollments) {
        // Use new SubjectPrice-based resolution
        const price = await this.subjectsService.resolveEnrollmentPrice(enrollment.id);
        let yearlyPriceNGN = price.yearlyPriceNGN;
        let yearlyPriceUSD = price.yearlyPriceUSD;

        let subNGN = yearlyPriceNGN;
        let subUSD = yearlyPriceUSD;

        switch (enrollment.billingFrequency) {
          case 'WEEKLY':
            subNGN = yearlyPriceNGN / 52;
            subUSD = yearlyPriceUSD / 52;
            break;
          case 'MONTHLY':
            subNGN = yearlyPriceNGN / 12;
            subUSD = yearlyPriceUSD / 12;
            break;
          case 'YEARLY':
            break;
        }

        subNGN = Math.round(subNGN * 100) / 100;
        subUSD = Math.round(subUSD * 100) / 100;

        totalComputedAmountNGN += subNGN;
        totalComputedAmountUSD += subUSD;

        breakdown.push({
          enrollmentId: enrollment.id,
          subjectName: enrollment.subject.name,
          billingFrequency: enrollment.billingFrequency,
          amountNGN: subNGN,
          amountUSD: subUSD,
        });
      }

      totalComputedAmountNGN = Math.round(totalComputedAmountNGN * 100) / 100;
      totalComputedAmountUSD = Math.round(totalComputedAmountUSD * 100) / 100;

      if (totalComputedAmountNGN <= 0 || totalComputedAmountUSD <= 0) {
        throw new AppError(400, 'Invalid payment amount. Please contact admin to set pricing for these enrollments.');
      }

      const parent = await prisma.user.findUnique({
        where: { id: parentId },
      });

      if (!parent || !parent.email) {
        throw new AppError(404, 'Parent not found or missing email');
      }

      // Use the requested currency (default to NGN) and corresponding amount
      const requestedCurrency = data.currency || 'NGN';
      const amountToSend = requestedCurrency === 'USD' ? totalComputedAmountUSD : totalComputedAmountNGN;

      const paymentResult = await this.paymentProvider.initiatePayment({
        amount: amountToSend,
        email: parent.email,
        currency: requestedCurrency,
        metadata: {
          enrollmentGroupId: data.enrollmentGroupId,
          parentId,
          subjectCount: enrollments.length,
          computedFromYearlyPriceNGN: totalComputedAmountNGN,
          computedFromYearlyPriceUSD: totalComputedAmountUSD,
        },
      });

      // Mark earlier PENDING payments for this enrollment group as EXPIRED
      await prisma.payment.updateMany({
        where: {
          parentId,
          enrollmentGroupId: data.enrollmentGroupId,
          status: 'PENDING',
        },
        data: {
          status: 'EXPIRED',
        },
      });

      const payment = await prisma.payment.create({
        data: {
          parentId,
          enrollmentGroupId: data.enrollmentGroupId,
          enrollmentId: null,
          amount: amountToSend,
          currency: requestedCurrency,
          provider: 'PAYSTACK',
          providerReference: paymentResult.reference,
          status: 'PENDING',
        },
      });

      return {
        payment,
        ...paymentResult,
        computedAmount: totalComputedAmountUSD,
        displayAmountUSD: totalComputedAmountUSD,
        chargedAmountNGN: totalComputedAmountNGN,
        chargedAmount: amountToSend,
        chargedCurrency: requestedCurrency,
        breakdown,
      };
    }

    // -------------------------------------------------------------------------
    // Path B: Single Enrollment Payment (data.enrollmentId provided)
    // -------------------------------------------------------------------------
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: data.enrollmentId! },
      include: {
        student: {
          include: {
            user: true,
          },
        },
        subject: true,
      },
    });

    if (!enrollment) {
      throw new AppError(404, 'Enrollment not found');
    }

    if (enrollment.student.parentId !== parentId) {
      throw new AppError(403, 'Not authorized to make payment for this enrollment');
    }

    // SECURITY: Compute amount server-side from SubjectPrice-based resolution
    // Resolution order: override > subject price > fail
    const price = await this.subjectsService.resolveEnrollmentPrice(enrollment.id);
    let yearlyPriceNGN = price.yearlyPriceNGN;
    let yearlyPriceUSD = price.yearlyPriceUSD;

    // Calculate amount based on billing frequency
    let computedAmountNGN = yearlyPriceNGN;
    let computedAmountUSD = yearlyPriceUSD;

    switch (enrollment.billingFrequency) {
      case 'WEEKLY':
        computedAmountNGN = yearlyPriceNGN / 52;
        computedAmountUSD = yearlyPriceUSD / 52;
        break;
      case 'MONTHLY':
        computedAmountNGN = yearlyPriceNGN / 12;
        computedAmountUSD = yearlyPriceUSD / 12;
        break;
      case 'YEARLY':
        break;
    }

    // Round to 2 decimal places
    computedAmountNGN = Math.round(computedAmountNGN * 100) / 100;
    computedAmountUSD = Math.round(computedAmountUSD * 100) / 100;

    if (computedAmountNGN <= 0 || computedAmountUSD <= 0) {
      throw new AppError(400, 'Invalid payment amount. Please contact admin to set pricing for this enrollment.');
    }

    const parent = await prisma.user.findUnique({
      where: { id: parentId },
    });

    if (!parent || !parent.email) {
      throw new AppError(404, 'Parent not found or missing email');
    }

    // Use the requested currency (default to NGN) and corresponding amount
    const requestedCurrency = data.currency || 'NGN';
    const amountToSend = requestedCurrency === 'USD' ? computedAmountUSD : computedAmountNGN;

    const paymentResult = await this.paymentProvider.initiatePayment({
      amount: amountToSend,
      email: parent.email,
      currency: requestedCurrency,
      metadata: {
        enrollmentId: data.enrollmentId,
        parentId,
        billingFrequency: enrollment.billingFrequency,
        computedFromYearlyPriceNGN: yearlyPriceNGN,
        computedFromYearlyPriceUSD: yearlyPriceUSD,
      },
    });

    // Mark earlier PENDING payments for this enrollment as EXPIRED
    await prisma.payment.updateMany({
      where: {
        parentId,
        enrollmentId: data.enrollmentId,
        status: 'PENDING',
      },
      data: {
        status: 'EXPIRED',
      },
    });

    const payment = await prisma.payment.create({
      data: {
        parentId,
        enrollmentId: data.enrollmentId,
        amount: amountToSend,
        currency: requestedCurrency,
        provider: 'PAYSTACK',
        providerReference: paymentResult.reference,
        status: 'PENDING',
      },
    });

    return {
      payment,
      ...paymentResult,
      computedAmount: computedAmountUSD,
      displayAmountUSD: computedAmountUSD,
      chargedAmountNGN: computedAmountNGN,
      chargedAmount: amountToSend,
      chargedCurrency: requestedCurrency,
      billingFrequency: enrollment.billingFrequency,
    };
  }

  async processWebhook(data: any, signature?: string | string[], rawBody?: string | Buffer) {
    // Convert Buffer to string if needed
    const rawBodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
    const webhookResult = await this.paymentProvider.processWebhook(data, signature, rawBodyStr);

    if (!webhookResult.valid) {
      throw new AppError(400, 'Invalid webhook signature');
    }

    // Find payment by reference
    const payment = await prisma.payment.findFirst({
      where: {
        providerReference: webhookResult.reference,
      },
    });

    if (!payment) {
      throw new AppError(404, 'Payment not found');
    }

    const isSuccess = webhookResult.status === 'success';

    // IDEMPOTENCY: If payment is already in the target state, return without changes
    if (payment.status === 'SUCCESS' && isSuccess) {
      logger.info({ paymentId: payment.id, reference: payment.providerReference }, 'Webhook replay detected - payment already SUCCESS, returning existing state');
      return payment;
    }
    if (payment.status === 'FAILED' && !isSuccess) {
      logger.info({ paymentId: payment.id, reference: payment.providerReference }, 'Webhook replay detected - payment already FAILED, returning existing state');
      return payment;
    }

    // IDEMPOTENCY: If payment status conflicts with webhook status, log warning but don't change
    if (payment.status === 'SUCCESS' && !isSuccess) {
      logger.warn({ paymentId: payment.id, reference: payment.providerReference, currentStatus: payment.status, webhookStatus: webhookResult.status }, 'Webhook status conflicts with current payment status - ignoring to prevent status reversal');
      return payment;
    }
    if (payment.status === 'FAILED' && isSuccess) {
      logger.warn({ paymentId: payment.id, reference: payment.providerReference, currentStatus: payment.status, webhookStatus: webhookResult.status }, 'Webhook status conflicts with current payment status - ignoring to prevent status reversal');
      return payment;
    }

    // Atomic transaction: update payment status AND activate enrollment(s)
    const updatedPayment = await prisma.$transaction(async (tx) => {
      const paidAt = isSuccess ? new Date() : null;
      const exchangeRate = isSuccess ? await this.getExchangeRate(payment.currency) : null;

      // Generate receipt number on first success
      let receiptNumber = payment.receiptNumber;
      if (isSuccess && !receiptNumber) {
        receiptNumber = await this.generateReceiptNumber(tx, paidAt!);
      }

      const p = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: isSuccess ? 'SUCCESS' : 'FAILED',
          paidAt,
          receiptNumber: receiptNumber || undefined,
          exchangeRateUsed: exchangeRate || undefined,
        },
      });

      if (isSuccess) {
        // If payment was EXPIRED but webhook confirms success, still activate enrollment
        // and log for admin review
        if (payment.status === 'EXPIRED') {
          logger.warn({ paymentId: payment.id, reference: payment.providerReference }, 'Payment confirmed success after being marked EXPIRED - activating enrollment for admin review');
        }

        if (payment.enrollmentGroupId) {
          // Atomically update ALL enrollments in the group to ACTIVE — no partial activation
          // Only activate enrollments that are currently PENDING_PAYMENT
          await tx.enrollment.updateMany({
            where: {
              enrollmentGroupId: payment.enrollmentGroupId,
              status: 'PENDING_PAYMENT',
            },
            data: { status: 'ACTIVE' },
          });
        } else if (payment.enrollmentId) {
          // Single enrollment activation - only if currently PENDING_PAYMENT
          const enrollment = await tx.enrollment.findUnique({
            where: { id: payment.enrollmentId },
          });

          if (enrollment && enrollment.status === 'PENDING_PAYMENT') {
            await tx.enrollment.update({
              where: { id: payment.enrollmentId },
              data: { status: 'ACTIVE' },
            });
          }
        }
      }

      return p;
    });

    // Send notifications after the transaction commits
    if (isSuccess) {
      await this.notificationCore.notify({
        recipientIds: [payment.parentId],
        type: 'PAYMENT_SUCCESS' as NotificationType,
        category: 'PAYMENTS' as NotificationCategory,
        title: 'Payment Successful',
        body: `Your payment of ${payment.currency} ${payment.amount} was successful`,
        entityType: 'Payment',
        entityId: payment.id,
        dedupeKey: `payment-success-${payment.id}`,
      });

      // Notify admins on EXPIRED → SUCCESS transitions for review
      if (payment.status === 'EXPIRED') {
        await this.notificationCore.notify({
          recipientRole: 'ADMIN',
          type: 'PAYMENT_EXPIRED' as NotificationType,
          category: 'PAYMENTS' as NotificationCategory,
          title: 'Payment Success After Expiry',
          body: `Payment ${payment.id} confirmed success after being marked EXPIRED - needs review`,
          entityType: 'Payment',
          entityId: payment.id,
          dedupeKey: `payment-expired-review-${payment.id}`,
        });
      }
    } else {
      await this.notificationCore.notify({
        recipientIds: [payment.parentId],
        type: 'PAYMENT_FAILED' as NotificationType,
        category: 'PAYMENTS' as NotificationCategory,
        title: 'Payment Failed',
        body: `Your payment of ${payment.currency} ${payment.amount} failed. Please try again.`,
        entityType: 'Payment',
        entityId: payment.id,
        dedupeKey: `payment-failed-${payment.id}`,
      });

      // Notify admins on failed payments
      await this.notificationCore.notify({
        recipientRole: 'ADMIN',
        type: 'PAYMENT_FAILED' as NotificationType,
        category: 'PAYMENTS' as NotificationCategory,
        title: 'Payment Failed',
        body: `Payment failed for parent`,
        entityType: 'Payment',
        entityId: payment.id,
        dedupeKey: `payment-failed-admin-${payment.id}`,
      });
    }

    return updatedPayment;
  }

  async getPaymentsByParent(parentId: string, filters: { status?: string; page?: number; limit?: number; from?: string; to?: string } = {}) {
    const { status, page = 1, limit = 20, from, to } = filters;
    const skip = (page - 1) * limit;

    const where: any = { parentId };
    if (status) {
      where.status = status;
    }
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          enrollment: {
            include: {
              student: true,
              subject: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Math.min(limit, 100),
      }),
      prisma.payment.count({ where }),
    ]);

    // Enrich with enrollment info
    const enrichedPayments = payments.map(payment => ({
      id: payment.id,
      reference: payment.providerReference,
      receiptNumber: payment.receiptNumber,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      createdAt: payment.createdAt,
      paidAt: payment.paidAt,
      provider: payment.provider,
      enrollment: payment.enrollment ? {
        student: {
          fullName: payment.enrollment.student.fullName,
        },
        subject: {
          name: payment.enrollment.subject.name,
        },
        billingFrequency: payment.enrollment.billingFrequency,
        enrollmentGroupId: payment.enrollment.enrollmentGroupId,
      } : null,
    }));

    // Calculate summary totals (SUCCESS only)
    const successPayments = payments.filter(p => p.status === 'SUCCESS');
    const totalPaidPerCurrency = successPayments.reduce((acc, p) => {
      acc[p.currency] = (acc[p.currency] || 0) + Number(p.amount);
      return acc;
    }, {} as Record<string, number>);

    return {
      data: enrichedPayments,
      page,
      limit,
      total,
      summary: {
        totalPaidPerCurrency,
      },
    };
  }

  async getPaymentById(paymentId: string, userId: string, userRole: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        enrollment: {
          include: {
            student: true,
            subject: true,
          },
        },
      },
    });

    if (!payment) {
      throw new AppError(404, 'Payment not found');
    }

    // SECURITY: Only the payment owner (parent) or admins can view
    if (userRole !== 'ADMIN' && payment.parentId !== userId) {
      throw new AppError(403, 'Not authorized to view this payment');
    }

    return payment;
  }

  async getPaymentByIdWithTimeline(paymentId: string, userId: string, userRole: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        enrollment: {
          include: {
            student: true,
            subject: true,
          },
        },
      },
    });

    if (!payment) {
      throw new AppError(404, 'Payment not found');
    }

    // SECURITY: Only the payment owner (parent) or admins can view
    if (userRole !== 'ADMIN' && payment.parentId !== userId) {
      throw new AppError(403, 'Not authorized to view this payment');
    }

    // Build timeline from payment events
    const timeline = [
      {
        event: 'Payment Initiated',
        timestamp: payment.createdAt,
        details: `Payment of ${payment.currency} ${payment.amount} initiated`,
      },
    ];

    if (payment.paidAt) {
      timeline.push({
        event: 'Payment Successful',
        timestamp: payment.paidAt,
        details: 'Payment verified and enrollment activated',
      });
    }

    if (payment.status === 'FAILED') {
      timeline.push({
        event: 'Payment Failed',
        timestamp: payment.createdAt,
        details: 'Payment transaction failed',
      });
    }

    if (payment.status === 'EXPIRED') {
      timeline.push({
        event: 'Payment Expired',
        timestamp: payment.createdAt,
        details: 'Payment expired before completion',
      });
    }

    return {
      ...payment,
      timeline,
    };
  }

  async verifyPaymentByReference(reference: string, userId: string, userRole: string) {
    const payment = await prisma.payment.findFirst({
      where: { providerReference: reference },
      include: {
        enrollment: {
          include: {
            student: true,
            subject: true,
          },
        },
      },
    });

    if (!payment) {
      throw new AppError(404, 'Payment not found');
    }

    // SECURITY: Only the payment owner (parent) or admins can verify
    if (userRole !== 'ADMIN' && payment.parentId !== userId) {
      throw new AppError(403, 'Not authorized to verify this payment');
    }

    // If payment is still pending, verify with Paystack directly
    if (payment.status === 'PENDING') {
      try {
        const verification = await this.paymentProvider.verifyPayment(reference);
        
        if (verification.status === 'success') {
          // Update payment status in database
          const updatedPayment = await prisma.$transaction(async (tx) => {
            const paidAt = new Date();
            const exchangeRate = await this.getExchangeRate(payment.currency);

            // Generate receipt number on first success
            let receiptNumber = payment.receiptNumber;
            if (!receiptNumber) {
              receiptNumber = await this.generateReceiptNumber(tx, paidAt);
            }

            const p = await tx.payment.update({
              where: { id: payment.id },
              data: {
                status: 'SUCCESS',
                paidAt,
                receiptNumber,
                exchangeRateUsed: exchangeRate || undefined,
              },
            });

            // Activate enrollment(s) if payment is successful
            if (payment.enrollmentGroupId) {
              await tx.enrollment.updateMany({
                where: { 
                  enrollmentGroupId: payment.enrollmentGroupId,
                  status: 'PENDING_PAYMENT',
                },
                data: { status: 'ACTIVE' },
              });
            } else if (payment.enrollmentId) {
              const enrollment = await tx.enrollment.findUnique({
                where: { id: payment.enrollmentId },
              });
              
              if (enrollment && enrollment.status === 'PENDING_PAYMENT') {
                await tx.enrollment.update({
                  where: { id: payment.enrollmentId },
                  data: { status: 'ACTIVE' },
                });
              }
            }

            return p;
          });

          // Send notification after transaction commits
          await this.notificationCore.notify({
            recipientIds: [payment.parentId],
            type: 'PAYMENT_SUCCESS' as NotificationType,
            category: 'PAYMENTS' as NotificationCategory,
            title: 'Payment Successful',
            body: `Your payment of ${payment.currency} ${payment.amount} was successful`,
            entityType: 'Payment',
            entityId: payment.id,
            dedupeKey: `payment-success-${payment.id}`,
          });

          // Return updated payment with relations
          return await prisma.payment.findFirst({
            where: { id: updatedPayment.id },
            include: {
              enrollment: {
                include: {
                  student: true,
                  subject: true,
                },
              },
            },
          });
        } else if (verification.status === 'failed') {
          // Update payment to failed
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'FAILED' },
          });
        }
      } catch (error) {
        logger.error({ error, reference }, 'Paystack verification failed, returning pending status');
        // Return payment as-is if verification fails
      }
    }

    return payment;
  }

  /**
   * Get receipt data for a payment (PARENT owner or ADMIN only)
   */
  async getReceipt(paymentId: string, userId: string, userRole: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        parent: true,
        enrollment: {
          include: {
            student: true,
            subject: true,
          },
        },
      },
    });

    if (!payment) {
      throw new AppError(404, 'Payment not found');
    }

    // Only parent owner or admin can access
    if (userRole !== 'ADMIN' && payment.parentId !== userId) {
      throw new AppError(403, 'Not authorized to view this receipt');
    }

    // Only SUCCESS payments have receipts
    if (payment.status !== 'SUCCESS') {
      throw new AppError(409, 'Receipt only available for successful payments');
    }

    // Get enrollment group data if group payment
    let enrollments = [];
    let subjects = [];
    let students = [];
    if (payment.enrollmentGroupId) {
      enrollments = await prisma.enrollment.findMany({
        where: { enrollmentGroupId: payment.enrollmentGroupId },
        include: {
          student: true,
          subject: true,
        },
      });
      subjects = [...new Set(enrollments.map(e => e.subject.name))];
      students = enrollments.map(e => e.student.fullName);
    } else if (payment.enrollment) {
      subjects = [payment.enrollment.subject.name];
      students = [payment.enrollment.student.fullName];
    }

    return {
      receiptNumber: payment.receiptNumber,
      paidAt: payment.paidAt,
      amount: payment.amount,
      currency: payment.currency,
      reference: payment.providerReference,
      parentName: payment.parent.fullName,
      parentEmail: payment.parent.email,
      studentNames: students,
      subjectNames: subjects,
      billingFrequency: payment.enrollment?.billingFrequency || null,
      enrollmentGroupId: payment.enrollmentGroupId,
      platformName: 'Smart-Tutor',
    };
  }

  /**
   * Generate PDF receipt for a payment
   */
  async getReceiptPdf(paymentId: string, userId: string, userRole: string): Promise<Buffer> {
    const receiptData = await this.getReceipt(paymentId, userId, userRole);

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    doc.fontSize(20).text('PAYMENT RECEIPT', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Receipt Number: ${receiptData.receiptNumber}`, { align: 'center' });
    doc.text(`Date: ${receiptData.paidAt?.toLocaleDateString()}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Platform: ${receiptData.platformName}`, { align: 'center' });
    doc.moveDown();

    doc.fontSize(14).text('Parent Information');
    doc.fontSize(10).text(`Name: ${receiptData.parentName}`);
    doc.text(`Email: ${receiptData.parentEmail}`);
    doc.moveDown();

    doc.fontSize(14).text('Student(s)');
    receiptData.studentNames.forEach(name => doc.fontSize(10).text(`- ${name}`));
    doc.moveDown();

    doc.fontSize(14).text('Subject(s)');
    receiptData.subjectNames.forEach(name => doc.fontSize(10).text(`- ${name}`));
    doc.moveDown();

    doc.fontSize(14).text('Payment Details');
    doc.fontSize(10).text(`Amount: ${receiptData.currency} ${receiptData.amount}`);
    doc.text(`Reference: ${receiptData.reference}`);
    if (receiptData.billingFrequency) {
      doc.text(`Billing Frequency: ${receiptData.billingFrequency}`);
    }
    if (receiptData.enrollmentGroupId) {
      doc.text(`Enrollment Group: ${receiptData.enrollmentGroupId}`);
    }

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });
  }
}
