import { Router } from 'express';
import { WebhooksController } from './webhooks.controller';

const router = Router();
const webhooksController = new WebhooksController();

// Zoom webhooks removed - replaced with Google Calendar
// router.post('/zoom', webhooksController.handleZoomWebhook);

export default router;
