import { Router } from 'express';
import { WebhooksController } from './webhooks.controller';

const router = Router();
const webhooksController = new WebhooksController();

// Zoom webhooks (no authentication - Zoom verifies via signature)
router.post('/zoom', webhooksController.handleZoomWebhook);

export default router;
