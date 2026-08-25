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
      const result = await this.paymentsService.processWebhook(req.body);
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
}
