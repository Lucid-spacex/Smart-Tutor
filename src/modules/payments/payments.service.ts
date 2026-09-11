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
        student: true,
      },
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    if (enrollment.student.parentId !== parentId) {
      throw new Error('Not authorized to make payment for this enrollment');
    }

    // SECURITY: Compute amount server-side from enrollment pricing
    // Never accept client-supplied amount to prevent payment fraud
    const yearlyPrice = Number(enrollment.yearlyPrice);
    let computedAmount = yearlyPrice;

    // Calculate amount based on billing frequency
    switch (enrollment.billingFrequency) {
      case 'WEEKLY':
        computedAmount = yearlyPrice / 52;
        break;
      case 'MONTHLY':
        computedAmount = yearlyPrice / 12;
        break;
      case 'YEARLY':
        computedAmount = yearlyPrice;
        break;
    }

    // Round to 2 decimal places
    computedAmount = Math.round(computedAmount * 100) / 100;

    if (computedAmount <= 0) {
      throw new Error('Invalid payment amount. Please contact admin to set pricing for this enrollment.');
    }

    // Get parent email
    const parent = await prisma.user.findUnique({
      where: { id: parentId },
    });

    if (!parent || !parent.email) {
      throw new Error('Parent not found or missing email');
    }

    // Use provided currency or default to USD
    const currency = data.currency || 'USD';

    // Initiate payment with provider using computed amount
    const paymentResult = await this.paymentProvider.initiatePayment({
      amount: computedAmount,
      email: parent.email,
      currency,
      metadata: {
        enrollmentId: data.enrollmentId,
        parentId,
        billingFrequency: enrollment.billingFrequency,
        computedFromYearlyPrice: yearlyPrice,
      },
    });

    // Create payment record with computed amount
    const payment = await prisma.payment.create({
      data: {
        parentId,
        enrollmentId: data.enrollmentId,
        amount: computedAmount,
        currency,
        provider: 'PAYSTACK',
        providerReference: paymentResult.reference,
        status: 'PENDING',
      },
    });

    return {
      payment,
      ...paymentResult,
      computedAmount,
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
