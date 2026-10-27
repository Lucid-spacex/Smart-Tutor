import { Router } from 'express';
import { PaymentsController } from '../payments/payments.controller';
import { rawBodyParser } from '../../middleware/webhook.middleware';

const router = Router();
const paymentsController = new PaymentsController();

// Paystack webhook - canonical handler with HMAC-SHA512 signature verification
// Exempt from ALL rate limiting (handled in app.ts)
// Use raw body parser to capture the body before JSON parsing for HMAC verification
router.post('/paystack', rawBodyParser, paymentsController.processWebhook);

// Zoom webhooks removed - replaced with Google Calendar
// router.post('/zoom', webhooksController.handleZoomWebhook);

export default router;
