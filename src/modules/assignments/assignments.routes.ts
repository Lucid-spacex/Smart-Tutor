import { Router } from 'express';
import { AssignmentsController } from './assignments.controller';
import { validate, validateQuery } from '../../middleware/validation.middleware';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { validateUUID } from '../../middleware/uuid-validation.middleware';
import { createAssignmentSchema, updateAssignmentSchema, getAssignmentsQuerySchema } from './assignments.validation';

const router = Router();
const assignmentsController = new AssignmentsController();

// Tutor creates assignments
router.post('/', authenticate, requireRole('TUTOR'), validate(createAssignmentSchema), assignmentsController.createAssignment);

// All authenticated users can view assignments (filtered by role in service)
router.get('/', authenticate, validateQuery(getAssignmentsQuerySchema), assignmentsController.getAssignments);

// Tutor updates assignment status
router.patch('/:id', authenticate, requireRole('TUTOR'), validateUUID('id'), validate(updateAssignmentSchema), assignmentsController.updateAssignment);

export default router;
