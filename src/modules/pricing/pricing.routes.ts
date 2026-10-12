import { Router } from 'express';
import { SubjectsController } from '../subjects/subjects.controller';
import { validateQuery } from '../../middleware/validation.middleware';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { pricingQuoteQuerySchema } from '../subjects/subjects.validation';

const router = Router();
const subjectsController = new SubjectsController();

// Get pricing quote for a student's subjects (parent only)
router.get('/quote', authenticate, requireRole('PARENT'), validateQuery(pricingQuoteQuerySchema), subjectsController.getPricingQuote);

export default router;
