import crypto from 'crypto';
import {
  PaymentProvider,
  PaymentInitiationData,
  PaymentInitiationResponse,
  PaymentVerificationResponse,
  WebhookProcessingResult,
} from './payment-provider.interface';
import { config } from '../../../config/env.config';
import { logger } from '../../../config/logger';

export class PaystackProvider implements PaymentProvider {
  private secretKey: string | undefined;

  constructor() {
    this.secretKey = config.PAYSTACK_SECRET_KEY;
    logger.info('Paystack provider initialized');
  }

  /**
   * Verify Paystack webhook signature
   * Prevents fake webhook calls
   */
  private verifyWebhookSignature(signature: string | string[] | undefined, rawBody: string): boolean {
    if (!signature || !this.secretKey) {
      return false;
    }

    // Paystack sends signature as a string
    const signatureStr = Array.isArray(signature) ? signature[0] : signature;

    // Compute HMAC-SHA512 hash
    const expectedSignature = crypto
      .createHmac('sha512', this.secretKey)
      .update(rawBody, 'utf8')
      .digest('hex');

    // Compare signatures using timing-safe comparison
    return crypto.timingSafeEqual(Buffer.from(signatureStr), Buffer.from(expectedSignature));
  }

  async initiatePayment(data: PaymentInitiationData): Promise<PaymentInitiationResponse> {
    // Stub implementation - in production, this would call Paystack API with this.secretKey
    console.log(`[PAYSTACK STUB] Using secret key: ${this.secretKey ? 'configured' : 'not configured'}`);
    console.log(`[PAYSTACK STUB] Initiating payment for ${data.email}: ${data.amount} ${data.currency || 'USD'}`);

    const reference = this.generateReference();

    return {
      success: true,
      reference,
      authorizationUrl: `https://paystack.com/pay/${reference}`,
      message: 'Payment initiated successfully',
    };
  }

  async verifyPayment(reference: string): Promise<PaymentVerificationResponse> {
    // Stub implementation - in production, this would call Paystack API
    console.log(`[PAYSTACK STUB] Verifying payment with reference: ${reference}`);

    // For testing, return success
    return {
      success: true,
      amount: 5000,
      currency: 'USD',
      status: 'success',
    };
  }

  async processWebhook(data: any, signature: string | string[] | undefined, rawBody: string): Promise<WebhookProcessingResult> {
    // Verify webhook signature first
    if (!this.verifyWebhookSignature(signature, rawBody)) {
      logger.error({ event: data.event }, 'Invalid webhook signature');
      return {
        valid: false,
        reference: '',
        status: 'failed',
      };
    }

    logger.info({ event: data.event, reference: data.data?.reference }, 'Processing webhook');

    const event = data.event;
    const reference = data.data.reference;

    if (event === 'charge.success') {
      return {
        valid: true,
        reference,
        status: 'success',
        amount: data.data.amount,
      };
    } else if (event === 'charge.failed') {
      return {
        valid: true,
        reference,
        status: 'failed',
      };
    }

    return {
      valid: false,
      reference,
      status: 'failed',
    };
  }

  private generateReference(): string {
    return `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
