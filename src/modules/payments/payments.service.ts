import prisma from '../../config/database';
import { PaystackProvider } from './providers/paystack.provider';
import { PaymentProvider } from './providers/payment-provider.interface';
import { InitiatePaymentInput } from './payments.validation';

export class PaymentsService {
  private paymentProvider: PaymentProvider;

  constructor() {
    this.paymentProvider = new PaystackProvider();
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
        throw new Error('Enrollment group not found');
      }

      // Verify all enrollments belong to the requesting parent
      const unauthorized = enrollments.find((e) => e.student.parentId !== parentId);
      if (unauthorized) {
        throw new Error('Not authorized to make payment for this enrollment group');
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
        let yearlyPriceNGN: number;
        let yearlyPriceUSD: number;

        if (enrollment.yearlyPriceNGN !== null && enrollment.yearlyPriceUSD !== null) {
          yearlyPriceNGN = Number(enrollment.yearlyPriceNGN);
          yearlyPriceUSD = Number(enrollment.yearlyPriceUSD);
        } else {
          const tier = enrollment.student.gradeBandTier
            ? await prisma.pricingTier.findUnique({
                where: { gradeBandTier: enrollment.student.gradeBandTier as any },
              })
            : null;

          if (tier) {
            yearlyPriceNGN = Number(tier.yearlyPriceNGN);
            yearlyPriceUSD = Number(tier.yearlyPriceUSD);
          } else if (enrollment.yearlyPrice && Number(enrollment.yearlyPrice) > 0) {
            yearlyPriceUSD = Number(enrollment.yearlyPrice);
            yearlyPriceNGN = Number(enrollment.yearlyPrice);
          } else {
            throw new Error(
              `No pricing configured for enrollment ${enrollment.id} (${enrollment.subject.name}). Please contact admin.`
            );
          }
        }

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
        throw new Error('Invalid payment amount. Please contact admin to set pricing for these enrollments.');
      }

      const parent = await prisma.user.findUnique({
        where: { id: parentId },
      });

      if (!parent || !parent.email) {
        throw new Error('Parent not found or missing email');
      }

      const paymentResult = await this.paymentProvider.initiatePayment({
        amount: totalComputedAmountNGN,
        email: parent.email,
        currency: 'NGN',
        metadata: {
          enrollmentGroupId: data.enrollmentGroupId,
          parentId,
          subjectCount: enrollments.length,
          computedFromYearlyPriceNGN: totalComputedAmountNGN,
          computedFromYearlyPriceUSD: totalComputedAmountUSD,
        },
      });

      const payment = await prisma.payment.create({
        data: {
          parentId,
          enrollmentGroupId: data.enrollmentGroupId,
          enrollmentId: null,
          amount: totalComputedAmountNGN,
          currency: 'NGN',
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
      throw new Error('Enrollment not found');
    }

    if (enrollment.student.parentId !== parentId) {
      throw new Error('Not authorized to make payment for this enrollment');
    }

    // SECURITY: Compute amount server-side from tiered pricing
    // Resolution order: override > tier default > legacy yearlyPrice
    let yearlyPriceNGN: number;
    let yearlyPriceUSD: number;

    if (enrollment.yearlyPriceNGN !== null && enrollment.yearlyPriceUSD !== null) {
      yearlyPriceNGN = Number(enrollment.yearlyPriceNGN);
      yearlyPriceUSD = Number(enrollment.yearlyPriceUSD);
    } else {
      const tier = enrollment.student.gradeBandTier
        ? await prisma.pricingTier.findUnique({
            where: { gradeBandTier: enrollment.student.gradeBandTier as any },
          })
        : null;

      if (tier) {
        yearlyPriceNGN = Number(tier.yearlyPriceNGN);
        yearlyPriceUSD = Number(tier.yearlyPriceUSD);
      } else if (enrollment.yearlyPrice && Number(enrollment.yearlyPrice) > 0) {
        yearlyPriceUSD = Number(enrollment.yearlyPrice);
        yearlyPriceNGN = Number(enrollment.yearlyPrice);
      } else {
        throw new Error('No pricing configured for this enrollment. Please contact admin.');
      }
    }

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
      throw new Error('Invalid payment amount. Please contact admin to set pricing for this enrollment.');
    }

    const parent = await prisma.user.findUnique({
      where: { id: parentId },
    });

    if (!parent || !parent.email) {
      throw new Error('Parent not found or missing email');
    }

    const paymentResult = await this.paymentProvider.initiatePayment({
      amount: computedAmountNGN,
      email: parent.email,
      currency: 'NGN',
      metadata: {
        enrollmentId: data.enrollmentId,
        parentId,
        billingFrequency: enrollment.billingFrequency,
        computedFromYearlyPriceNGN: yearlyPriceNGN,
        computedFromYearlyPriceUSD: yearlyPriceUSD,
      },
    });

    const payment = await prisma.payment.create({
      data: {
        parentId,
        enrollmentId: data.enrollmentId,
        amount: computedAmountNGN,
        currency: 'NGN',
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
      billingFrequency: enrollment.billingFrequency,
    };
  }

  async processWebhook(data: any, signature?: string | string[], rawBody?: string) {
    const webhookResult = await this.paymentProvider.processWebhook(data, signature, rawBody);

    if (!webhookResult.valid) {
      throw new Error('Invalid webhook signature');
    }

    // Find payment by reference
    const payment = await prisma.payment.findFirst({
      where: {
        providerReference: webhookResult.reference,
      },
    });

    if (!payment) {
      throw new Error('Payment not found');
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
        if (payment.enrollmentGroupId) {
          // Atomically update ALL enrollments in the group to ACTIVE — no partial activation
          await tx.enrollment.updateMany({
            where: { enrollmentGroupId: payment.enrollmentGroupId },
            data: { status: 'ACTIVE' },
          });
        } else if (payment.enrollmentId) {
          // Single enrollment activation
          await tx.enrollment.update({
            where: { id: payment.enrollmentId },
            data: { status: 'ACTIVE' },
          });
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
}
