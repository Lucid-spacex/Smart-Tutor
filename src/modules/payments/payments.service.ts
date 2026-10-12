import prisma from '../../config/database';
import { logger } from '../../config/logger';
import { PaystackProvider } from './providers/paystack.provider';
import { PaymentProvider } from './providers/payment-provider.interface';
import { InitiatePaymentInput } from './payments.validation';
import { AppError } from '../../middleware/error-handler.middleware';
import { SubjectsService } from '../subjects/subjects.service';

export class PaymentsService {
  private paymentProvider: PaymentProvider;
  private subjectsService: SubjectsService;

  constructor() {
    this.paymentProvider = new PaystackProvider();
    this.subjectsService = new SubjectsService();
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

  async processWebhook(data: any, signature?: string | string[], rawBody?: string) {
    const webhookResult = await this.paymentProvider.processWebhook(data, signature, rawBody);

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

    // Atomic transaction: update payment status AND activate enrollment(s)
    const updatedPayment = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: isSuccess ? 'SUCCESS' : 'FAILED',
          paidAt: isSuccess ? new Date() : null,
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

    return updatedPayment;
  }

  async getPaymentsByParent(parentId: string) {
    return prisma.payment.findMany({
      where: { parentId },
      include: {
        enrollment: {
          include: {
            student: true,
            subject: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async verifyPaymentByReference(reference: string) {
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

    // If payment is still pending, verify with Paystack directly
    if (payment.status === 'PENDING') {
      try {
        const verification = await this.paymentProvider.verifyPayment(reference);
        
        if (verification.status === 'success') {
          // Update payment status in database
          const updatedPayment = await prisma.$transaction(async (tx) => {
            const p = await tx.payment.update({
              where: { id: payment.id },
              data: {
                status: 'SUCCESS',
                paidAt: new Date(),
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
}
