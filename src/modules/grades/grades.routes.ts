import { Router } from 'express';
import { GradesController } from './grades.controller';
import { validate, validateQuery } from '../../middleware/validation.middleware';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { validateUUID } from '../../middleware/uuid-validation.middleware';
import { createGradeSchema, approveGradeSchema, rejectGradeSchema, getGradesQuerySchema, updateGradeSchema } from './grades.validation';
import { uploadAttachment, handleUploadError } from '../../middleware/upload.middleware';

const router = Router();
const gradesController = new GradesController();

// Tutor creates grades (always starts as PENDING_APPROVAL)
router.post('/', authenticate, requireRole('TUTOR'), validate(createGradeSchema), uploadAttachment, handleUploadError, gradesController.createGrade);

// All authenticated users can view grades (filtered by role in service)
router.get('/', authenticate, validateQuery(getGradesQuerySchema), gradesController.getGrades);

// Tutor updates grade (only when PENDING_APPROVAL or REJECTED)
router.patch('/:id', authenticate, requireRole('TUTOR'), validateUUID('id'), validate(updateGradeSchema), uploadAttachment, handleUploadError, gradesController.updateGrade);

// Tutor deletes grade (only when PENDING_APPROVAL or REJECTED)
router.delete('/:id', authenticate, requireRole('TUTOR'), validateUUID('id'), gradesController.deleteGrade);

// Admin grade approval endpoints (separate from main grades)
router.get('/pending', authenticate, requireRole('ADMIN'), gradesController.getPendingGrades);
router.patch('/:id/approve', authenticate, requireRole('ADMIN'), validateUUID('id'), validate(approveGradeSchema), gradesController.approveGrade);
router.patch('/:id/reject', authenticate, requireRole('ADMIN'), validateUUID('id'), validate(rejectGradeSchema), gradesController.rejectGrade);

export default router;
