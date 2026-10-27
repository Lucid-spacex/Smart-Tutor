import { Router } from 'express';
import { PaymentsController } from './payments.controller';
import { validate } from '../../middleware/validation.middleware';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { tier1AuthRateLimit } from '../../middleware/rate-limit.middleware';
import { initiatePaymentSchema } from './payments.validation';
import { rawBodyParser } from '../../middleware/webhook.middleware';

const router = Router();
const paymentsController = new PaymentsController();

// POST /payments/initiate — Tier 1 (Strict): 7 req / 15 min keyed by IP+email.
// Payment initiation is treated the same as an auth endpoint from an abuse
// perspective — someone spamming payment initiations is a genuine fraud vector.
router.post('/initiate', authenticate, requireRole('PARENT'), tier1AuthRateLimit, validate(initiatePaymentSchema), paymentsController.initiatePayment);

// Webhooks have no rate limiting — they must always be reachable by Paystack.
// Use raw body parser to capture the body before JSON parsing for HMAC verification
router.post('/webhook', rawBodyParser, paymentsController.processWebhook);

// GET /payments — Tier 3 (Loose) via app.ts global read limiter.
router.get('/', authenticate, requireRole('PARENT'), paymentsController.getPayments);

// GET /payments/verify/:reference — Verify payment status by reference
// Requires authentication: parent (owner) or admin
router.get('/verify/:reference', authenticate, paymentsController.verifyPayment);

export default router;
