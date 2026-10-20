import { Router } from 'express';
import { GradesController } from './grades.controller';
import { validate, validateQuery } from '../../middleware/validation.middleware';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { requireApprovedTutor } from '../../middleware/requireApprovedTutor.middleware';
import { validateUUID } from '../../middleware/uuid-validation.middleware';
import { createGradeSchema, approveGradeSchema, rejectGradeSchema, getGradesQuerySchema, updateGradeSchema, bulkApproveSchema } from './grades.validation';

const router = Router();
const gradesController = new GradesController();

// New grading workflow endpoints (tutor)
router.post('/', authenticate, requireRole('TUTOR'), requireApprovedTutor, validate(createGradeSchema), gradesController.createDraftGrade);
router.patch('/:id', authenticate, requireRole('TUTOR'), requireApprovedTutor, validateUUID('id'), validate(updateGradeSchema), gradesController.updateGrade);
router.delete('/:id', authenticate, requireRole('TUTOR'), requireApprovedTutor, validateUUID('id'), gradesController.deleteGrade);
router.post('/:id/submit', authenticate, requireRole('TUTOR'), requireApprovedTutor, validateUUID('id'), gradesController.submitGrade);
router.post('/:id/withdraw', authenticate, requireRole('TUTOR'), requireApprovedTutor, validateUUID('id'), gradesController.withdrawGrade);
router.get('/:id/preview', authenticate, requireRole('TUTOR'), requireApprovedTutor, validateUUID('id'), gradesController.previewGrade);

// Admin grade review endpoints (mounted under /admin/grades)
const adminRouter = Router();
adminRouter.get('/', authenticate, requireRole('ADMIN'), validateQuery(getGradesQuerySchema), gradesController.getAdminGrades);
adminRouter.get('/:id', authenticate, requireRole('ADMIN'), validateUUID('id'), gradesController.getAdminGrade);
adminRouter.patch('/:id/approve', authenticate, requireRole('ADMIN'), validateUUID('id'), validate(approveGradeSchema), gradesController.approveGrade);
adminRouter.patch('/:id/reject', authenticate, requireRole('ADMIN'), validateUUID('id'), validate(rejectGradeSchema), gradesController.rejectGrade);
adminRouter.post('/bulk-approve', authenticate, requireRole('ADMIN'), validate(bulkApproveSchema), gradesController.bulkApproveGrades);

// Legacy endpoint (keep for backward compatibility)
router.get('/', authenticate, validateQuery(getGradesQuerySchema), gradesController.getGrades);

export { adminRouter as adminGradesRouter };
export default router;
