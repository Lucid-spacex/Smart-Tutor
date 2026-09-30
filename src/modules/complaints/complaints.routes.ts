import { Router } from 'express';
import { ComplaintsController } from './complaints.controller';
import { validate } from '../../middleware/validation.middleware';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { validateUUID } from '../../middleware/uuid-validation.middleware';
import { createComplaintSchema, resolveComplaintSchema } from './complaints.validation';

const router = Router();
const complaintsController = new ComplaintsController();

// Only parents can file complaints (tutors now use messaging)
router.post('/', authenticate, requireRole('PARENT'), validate(createComplaintSchema), complaintsController.createComplaint);

// Admins and filers can view complaints
router.get('/', authenticate, complaintsController.getComplaints);

// Admins can resolve complaints
router.patch('/:id/resolve', authenticate, requireRole('ADMIN'), validateUUID('id'), validate(resolveComplaintSchema), complaintsController.resolveComplaint);

export default router;
