import { Router } from 'express';
import { AssignmentsController } from './assignments.controller';
import { validate, validateQuery } from '../../middleware/validation.middleware';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { validateUUID } from '../../middleware/uuid-validation.middleware';
import { createAssignmentSchema, updateAssignmentSchema, getAssignmentsQuerySchema, submitAssignmentSchema, provideFeedbackSchema } from './assignments.validation';
import { uploadAttachment, handleUploadError } from '../../middleware/upload.middleware';

const router = Router();
const assignmentsController = new AssignmentsController();

// Tutor creates assignments
router.post('/', authenticate, requireRole('TUTOR'), validate(createAssignmentSchema), uploadAttachment, handleUploadError, assignmentsController.createAssignment);

// All authenticated users can view assignments (filtered by role in service)
router.get('/', authenticate, validateQuery(getAssignmentsQuerySchema), assignmentsController.getAssignments);

// Tutor updates assignment
router.patch('/:id', authenticate, requireRole('TUTOR'), validateUUID('id'), validate(updateAssignmentSchema), uploadAttachment, handleUploadError, assignmentsController.updateAssignment);

// Tutor deletes assignment
router.delete('/:id', authenticate, requireRole('TUTOR'), validateUUID('id'), assignmentsController.deleteAssignment);

// Student submits assignment
router.post('/:id/submit', authenticate, requireRole('STUDENT'), validateUUID('id'), validate(submitAssignmentSchema), uploadAttachment, handleUploadError, assignmentsController.submitAssignment);

// Tutor provides feedback on submission
router.patch('/:id/submissions/:submissionId/feedback', authenticate, requireRole('TUTOR'), validateUUID('id'), validateUUID('submissionId'), validate(provideFeedbackSchema), uploadAttachment, handleUploadError, assignmentsController.provideFeedback);

export default router;
