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

    // Get parent email
    const parent = await prisma.user.findUnique({
      where: { id: parentId },
    });

    if (!parent) {
      throw new Error('Parent not found');
    }

    // Initiate payment with provider
    const paymentResult = await this.paymentProvider.initiatePayment({
      amount: data.amount,
      email: parent.email,
      currency: data.currency,
      metadata: {
        enrollmentId: data.enrollmentId,
        parentId,
      },
    });

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        parentId,
        enrollmentId: data.enrollmentId,
        amount: data.amount,
        currency: data.currency,
        provider: 'PAYSTACK',
        providerReference: paymentResult.reference,
        status: 'PENDING',
      },
    });

    return {
      payment,
      ...paymentResult,
    };
  }

  async processWebhook(data: any) {
    const webhookResult = await this.paymentProvider.processWebhook(data);

    if (!webhookResult.valid) {
      throw new Error('Invalid webhook');
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

    // Update payment status
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
