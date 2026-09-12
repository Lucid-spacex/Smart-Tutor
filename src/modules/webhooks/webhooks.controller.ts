import { Request, Response, NextFunction } from 'express';
import { ZoomService } from '../../services/zoom.service';
import { logger } from '../../config/logger';

export class WebhooksController {
  private zoomService: ZoomService;

  constructor() {
    this.zoomService = new ZoomService();
  }

  handleZoomWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const signature = req.headers['x-zm-signature'] as string;
      const timestamp = req.headers['x-zm-request-timestamp'] as string;
      const rawBody = (req as any).rawBody; // Raw body from middleware

      // Verify webhook signature
      if (!this.zoomService.verifyWebhookSignature(signature, timestamp, rawBody)) {
        logger.warn({ signature, timestamp }, 'Invalid Zoom webhook signature');
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }

      const payload = req.body;

      logger.info({ event: payload.event }, 'Zoom webhook received');

      // Handle recording.completed event
      if (payload.event === 'recording.completed') {
        await this.zoomService.handleRecordingCompleted(payload);
        res.status(200).json({ message: 'Recording processed' });
        return;
      }

      // Acknowledge other events
      res.status(200).json({ message: 'Event acknowledged' });
    } catch (error) {
      logger.error({ error }, 'Error processing Zoom webhook');
      next(error);
    }
  };
}
