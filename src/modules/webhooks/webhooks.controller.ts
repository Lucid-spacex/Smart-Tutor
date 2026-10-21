import { Request, Response, NextFunction } from 'express';
import { logger } from '../../config/logger';

export class WebhooksController {
  // Zoom webhooks removed - replaced with Google Calendar
  // Paystack webhooks remain active (handled in payment routes)

  handlePaystackWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payload = req.body;
      logger.info({ event: payload.event }, 'Paystack webhook received');
      res.status(200).json({ message: 'Event acknowledged' });
    } catch (error) {
      logger.error({ error }, 'Error processing Paystack webhook');
      next(error);
    }
  };
}
