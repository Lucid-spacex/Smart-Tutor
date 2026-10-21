import { Router } from 'express';
import { WebhooksController } from './webhooks.controller';

const router = Router();
const webhooksController = new WebhooksController();

// Paystack webhooks for payment notifications
router.post('/paystack', webhooksController.handlePaystackWebhook);

// Zoom webhooks removed - replaced with Google Calendar
// router.post('/zoom', webhooksController.handleZoomWebhook);

export default router;
