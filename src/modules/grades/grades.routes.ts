import { Router } from 'express';
import { GradesController } from './grades.controller';
import { validate, validateQuery } from '../../middleware/validation.middleware';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { validateUUID } from '../../middleware/uuid-validation.middleware';
import { createGradeSchema, approveGradeSchema, rejectGradeSchema, getGradesQuerySchema } from './grades.validation';

const router = Router();
const gradesController = new GradesController();

// Tutor creates grades (always starts as PENDING_APPROVAL)
router.post('/', authenticate, requireRole('TUTOR'), validate(createGradeSchema), gradesController.createGrade);

// All authenticated users can view grades (filtered by role in service)
router.get('/', authenticate, validateQuery(getGradesQuerySchema), gradesController.getGrades);

// Admin grade approval endpoints (separate from main grades)
router.get('/pending', authenticate, requireRole('ADMIN'), gradesController.getPendingGrades);
router.patch('/:id/approve', authenticate, requireRole('ADMIN'), validateUUID('id'), validate(approveGradeSchema), gradesController.approveGrade);
router.patch('/:id/reject', authenticate, requireRole('ADMIN'), validateUUID('id'), validate(rejectGradeSchema), gradesController.rejectGrade);

export default router;
