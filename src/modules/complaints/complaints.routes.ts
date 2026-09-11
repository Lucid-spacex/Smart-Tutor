import { Router } from 'express';
import { ComplaintsController } from './complaints.controller';
import { validate } from '../../middleware/validation.middleware';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { validateUUID } from '../../middleware/uuid-validation.middleware';
import { createComplaintSchema, resolveComplaintSchema } from './complaints.validation';

const router = Router();
const complaintsController = new ComplaintsController();

// Parents and tutors can file complaints
router.post('/', authenticate, requireRole('PARENT', 'TUTOR'), validate(createComplaintSchema), complaintsController.createComplaint);

// Admins and filers can view complaints
router.get('/', authenticate, complaintsController.getComplaints);

// Admins can resolve complaints
router.patch('/:id/resolve', authenticate, requireRole('ADMIN'), validateUUID('id'), validate(resolveComplaintSchema), complaintsController.resolveComplaint);

export default router;
