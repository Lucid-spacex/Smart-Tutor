import { Router } from 'express';
import { PaymentsController } from './payments.controller';
import { validate } from '../../middleware/validation.middleware';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { paymentRateLimit } from '../../middleware/rate-limit.middleware';
import { initiatePaymentSchema } from './payments.validation';

const router = Router();
const paymentsController = new PaymentsController();

router.post('/initiate', authenticate, requireRole('PARENT'), paymentRateLimit, validate(initiatePaymentSchema), paymentsController.initiatePayment);
router.post('/webhook', paymentsController.processWebhook);
router.get('/', authenticate, requireRole('PARENT'), paymentsController.getPayments);

export default router;
