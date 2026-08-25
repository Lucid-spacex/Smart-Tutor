export interface PaymentProvider {
  initiatePayment(data: PaymentInitiationData): Promise<PaymentInitiationResponse>;
  verifyPayment(reference: string): Promise<PaymentVerificationResponse>;
  processWebhook(data: any): Promise<WebhookProcessingResult>;
}

export interface PaymentInitiationData {
  amount: number;
  email: string;
  currency?: string;
  metadata?: Record<string, any>;
}

export interface PaymentInitiationResponse {
  success: boolean;
  reference: string;
  authorizationUrl?: string;
  message?: string;
}

export interface PaymentVerificationResponse {
  success: boolean;
  amount: number;
  currency: string;
  status: 'success' | 'failed' | 'pending';
  metadata?: Record<string, any>;
}

export interface WebhookProcessingResult {
  valid: boolean;
  reference: string;
  status: 'success' | 'failed';
  amount?: number;
}
