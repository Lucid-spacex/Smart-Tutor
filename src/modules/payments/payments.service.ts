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
    // Verify enrollment belongs to parent
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: data.enrollmentId },
      include: {
        student: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    if (enrollment.student.parentId !== parentId) {
      throw new Error('Not authorized to make payment for this enrollment');
    }

    // SECURITY: Compute amount server-side from tiered pricing
    // Resolution order: override > tier default
    let yearlyPriceNGN: number;
    let yearlyPriceUSD: number;

    // Check for override first
    if (enrollment.yearlyPriceNGN !== null && enrollment.yearlyPriceUSD !== null) {
      yearlyPriceNGN = Number(enrollment.yearlyPriceNGN);
      yearlyPriceUSD = Number(enrollment.yearlyPriceUSD);
    } else {
      // Fall back to tier default
      const tier = await prisma.pricingTier.findUnique({
        where: { gradeBandTier: enrollment.student.gradeBandTier },
      });

      if (!tier) {
        throw new Error('No pricing configured for this enrollment. Please contact admin.');
      }

      yearlyPriceNGN = Number(tier.yearlyPriceNGN);
      yearlyPriceUSD = Number(tier.yearlyPriceUSD);
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
        // Already yearly
        break;
    }

    // Round to 2 decimal places
    computedAmountNGN = Math.round(computedAmountNGN * 100) / 100;
    computedAmountUSD = Math.round(computedAmountUSD * 100) / 100;

    if (computedAmountNGN <= 0 || computedAmountUSD <= 0) {
      throw new Error('Invalid payment amount. Please contact admin to set pricing for this enrollment.');
    }

    // Get parent email
    const parent = await prisma.user.findUnique({
      where: { id: parentId },
    });

    if (!parent || !parent.email) {
      throw new Error('Parent not found or missing email');
    }

    // Initiate payment with provider using NGN amount (Paystack is Nigerian-focused)
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

    // Create payment record with NGN amount
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

    // Update payment status (idempotent - safe to retry)
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: webhookResult.status === 'success' ? 'SUCCESS' : 'FAILED',
        paidAt: webhookResult.status === 'success' ? new Date() : null,
      },
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
