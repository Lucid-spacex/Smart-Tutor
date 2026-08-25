import { Router } from 'express';
import { ProgressReportsController } from './progress-reports.controller';
import { validate, validateQuery } from '../../middleware/validation.middleware';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { createProgressReportSchema, getProgressReportsQuerySchema } from './progress-reports.validation';

const router = Router();
const progressReportsController = new ProgressReportsController();

router.post('/', authenticate, requireRole('TUTOR'), validate(createProgressReportSchema), progressReportsController.createProgressReport);
router.get('/', authenticate, validateQuery(getProgressReportsQuerySchema), progressReportsController.getProgressReports);

export default router;
