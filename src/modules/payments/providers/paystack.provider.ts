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

// Paystack API response types
interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code?: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    status: string;
    reference: string;
    amount: number;
    currency: string;
    [key: string]: any;
  };
}

interface PaystackErrorResponse {
  status: boolean;
  message: string;
}

export class PaystackProvider implements PaymentProvider {
  private secretKey: string | undefined;
  private readonly PAYSTACK_API_URL = 'https://api.paystack.co';

  constructor() {
    this.secretKey = config.PAYSTACK_SECRET_KEY;
    
    if (!this.secretKey) {
      logger.warn('Paystack secret key not configured - payment initiation will fail');
    } else {
      logger.info('Paystack provider initialized with API key');
    }
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
    // Validate API key is configured
    if (!this.secretKey) {
      const error = 'Paystack secret key not configured. Please set PAYSTACK_SECRET_KEY in environment variables.';
      logger.error({ error }, 'Paystack payment initiation failed - missing API key');
      throw new Error(error);
    }

    // Validate required fields
    if (!data.email || !data.amount) {
      const error = 'Missing required payment data: email and amount are required';
      logger.error({ error, email: data.email, amount: data.amount }, 'Paystack payment initiation failed - invalid data');
      throw new Error(error);
    }

    // Validate amount is positive
    if (data.amount <= 0 || isNaN(data.amount)) {
      const error = `Invalid payment amount: ${data.amount}. Amount must be a positive number.`;
      logger.error({ error, amount: data.amount }, 'Paystack payment initiation failed - invalid amount');
      throw new Error(error);
    }

    const reference = this.generateReference();
    const currency = data.currency || 'NGN';

    try {
      logger.info({
        email: data.email,
        amount: data.amount,
        currency,
        reference,
      }, 'Initiating Paystack payment');

      // Prepare Paystack API request
      const requestBody = {
        email: data.email,
        amount: Math.round(data.amount * 100), // Convert to kobo/cents (smallest currency unit)
        currency,
        reference,
        metadata: data.metadata || {},
        callback_url: this.getCallbackUrl(),
      };

      const response = await fetch(`${this.PAYSTACK_API_URL}/transaction/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json() as PaystackInitializeResponse | PaystackErrorResponse;

      if (!response.ok) {
        const error = (responseData as PaystackErrorResponse).message || 'Paystack API request failed';
        logger.error({
          status: response.status,
          statusText: response.statusText,
          error,
          reference,
        }, 'Paystack API request failed');
        
        throw new Error(`Paystack API error: ${error}`);
      }

      const successResponse = responseData as PaystackInitializeResponse;
      if (!successResponse.data || !successResponse.data.authorization_url) {
        const error = 'Paystack API response missing authorization_url';
        logger.error({
          response: responseData,
          reference,
        }, 'Paystack API response invalid');
        
        throw new Error(error);
      }

      logger.info({
        reference,
        authorizationUrl: successResponse.data.authorization_url,
        accessCode: successResponse.data.access_code,
      }, 'Paystack payment initiated successfully');

      return {
        success: true,
        reference,
        accessCode: successResponse.data.access_code,
        authorizationUrl: successResponse.data.authorization_url,
        message: successResponse.message || 'Payment initiated successfully',
      };

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        reference,
        email: data.email,
        amount: data.amount,
        currency,
      }, 'Paystack payment initiation failed');
      
      throw error;
    }
  }

  async verifyPayment(reference: string): Promise<PaymentVerificationResponse> {
    if (!this.secretKey) {
      throw new Error('Paystack secret key not configured');
    }

    try {
      logger.info({ reference }, 'Verifying Paystack payment');

      const response = await fetch(`${this.PAYSTACK_API_URL}/transaction/verify/${reference}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
        },
      });

      const responseData = await response.json() as PaystackVerifyResponse | PaystackErrorResponse;

      if (!response.ok) {
        const error = (responseData as PaystackErrorResponse).message;
        logger.error({
          status: response.status,
          reference,
          error,
        }, 'Paystack verification failed');
        
        throw new Error(`Paystack verification failed: ${error}`);
      }

      const verifyResponse = responseData as PaystackVerifyResponse;
      const status = verifyResponse.data?.status?.toLowerCase();
      
      // Map Paystack status to our expected union type
      const mappedStatus: 'success' | 'failed' | 'pending' = 
        status === 'success' ? 'success' : 
        status === 'failed' ? 'failed' : 'pending';
      
      return {
        success: status === 'success',
        amount: verifyResponse.data?.amount || 0,
        currency: verifyResponse.data?.currency || 'NGN',
        status: mappedStatus,
      };

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        reference,
      }, 'Paystack payment verification failed');
      
      throw error;
    }
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

  private getCallbackUrl(): string {
    // In production, this should be configured via environment variable
    // Use FRONTEND_URL for the callback, fallback to ALLOWED_ORIGINS
    const frontendUrl = process.env.FRONTEND_URL || process.env.ALLOWED_ORIGINS?.split(',')[0];
    if (frontendUrl) {
      return `${frontendUrl}/payment/callback`;
    }
    
    // Fallback - using the actual frontend production URL
    logger.warn('No FRONTEND_URL or ALLOWED_ORIGINS configured - using default callback URL');
    return 'https://teach-me-hub.vercel.app/payment/callback';
  }
}
