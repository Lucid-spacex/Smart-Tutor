import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import bodyParser from 'body-parser';

/**
 * Capture raw request body for webhook signature verification
 * This middleware uses body-parser's raw mode to capture the body before JSON parsing
 */
export const captureRawBody = (req: Request, res: Response, next: NextFunction): void => {
  // Only capture for webhook endpoints
  if (req.path.includes('/webhooks/paystack') || req.path.includes('/payments/webhook')) {
    bodyParser.raw({ type: '*/*', limit: '10mb' })(req, res, (err) => {
      if (err) {
        return next(err);
      }
      (req as any).rawBody = (req as any).body.toString('utf8');
      // Parse JSON for req.body
      try {
        req.body = JSON.parse((req as any).rawBody);
      } catch (e) {
        req.body = {};
      }
      next();
    });
  } else {
    next();
  }
};

/**
 * Raw body parser for direct use on webhook routes
 * This is the same as captureRawBody but as a body-parser middleware
 */
export const rawBodyParser = bodyParser.raw({ type: '*/*', limit: '10mb' });
