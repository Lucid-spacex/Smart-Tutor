import { Router } from 'express';
import { AdminController } from './admin.controller';
import { validate } from '../../middleware/validation.middleware';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { updateTutorVettingSchema, assignTutorSchema } from './admin.validation';

const router = Router();
const adminController = new AdminController();

router.get('/tutors/pending', authenticate, requireRole('ADMIN'), adminController.getPendingTutors);
router.patch('/tutors/:id/vetting', authenticate, requireRole('ADMIN'), validate(updateTutorVettingSchema), adminController.updateTutorVetting);
router.get('/enrollments/unmatched', authenticate, requireRole('ADMIN'), adminController.getUnmatchedEnrollments);
router.patch('/enrollments/:id/assign-tutor', authenticate, requireRole('ADMIN'), validate(assignTutorSchema), adminController.assignTutor);
router.get('/payments/failed', authenticate, requireRole('ADMIN'), adminController.getFailedPayments);
router.get('/reports/overview', authenticate, requireRole('ADMIN'), adminController.getOverviewReport);

export default router;
