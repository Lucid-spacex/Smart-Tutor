import { Router } from 'express';
import { EnrollmentsController } from './enrollments.controller';
import { validate, validateQuery } from '../../middleware/validation.middleware';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { validateUUID } from '../../middleware/uuid-validation.middleware';
import { createEnrollmentSchema, getEnrollmentsQuerySchema } from './enrollments.validation';

const router = Router();
const enrollmentsController = new EnrollmentsController();

router.post('/', authenticate, requireRole('PARENT'), validate(createEnrollmentSchema), enrollmentsController.createEnrollment);
router.get('/', authenticate, requireRole('PARENT', 'TUTOR'), validateQuery(getEnrollmentsQuerySchema), enrollmentsController.getEnrollments);
router.get('/:id', authenticate, requireRole('PARENT', 'TUTOR'), validateUUID('id'), enrollmentsController.getEnrollmentById);

export default router;
