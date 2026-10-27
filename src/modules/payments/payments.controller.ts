import { Request, Response, NextFunction } from 'express';
import { PaymentsService } from './payments.service';
import { InitiatePaymentInput } from './payments.validation';

export class PaymentsController {
  private paymentsService: PaymentsService;

  constructor() {
    this.paymentsService = new PaymentsService();
  }

  initiatePayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parentId = req.user?.userId;
      if (!parentId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const data: InitiatePaymentInput = req.body;
      const result = await this.paymentsService.initiatePayment(parentId, data);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  processWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const signature = req.headers['x-paystack-signature'];
      let rawBody: string;
      let parsedBody: any;

      // When using rawBodyParser, req.body is a Buffer
      if (Buffer.isBuffer(req.body)) {
        rawBody = req.body.toString('utf8');
        parsedBody = JSON.parse(rawBody);
      } else {
        // Fallback: try to get rawBody from middleware or stringify req.body
        rawBody = (req as any).rawBody || JSON.stringify(req.body);
        parsedBody = req.body;
      }

      const result = await this.paymentsService.processWebhook(parsedBody, signature, rawBody);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getPayments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parentId = req.user?.userId;
      if (!parentId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const payments = await this.paymentsService.getPaymentsByParent(parentId);
      res.status(200).json(payments);
    } catch (error) {
      next(error);
    }
  };

  verifyPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      if (!userId || !userRole) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { reference } = req.params;
      if (!reference) {
        res.status(400).json({ error: 'Reference is required' });
        return;
      }

      const payment = await this.paymentsService.verifyPaymentByReference(reference, userId, userRole);
      res.status(200).json(payment);
    } catch (error) {
      next(error);
    }
  };

  getPaymentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      if (!userId || !userRole) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const payment = await this.paymentsService.getPaymentById(id, userId, userRole);
      res.status(200).json(payment);
    } catch (error) {
      next(error);
    }
  };
}
