import { Router } from 'express';
import { SessionsController } from './sessions.controller';
import { validate, validateQuery } from '../../middleware/validation.middleware';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { validateUUID } from '../../middleware/uuid-validation.middleware';
import { updateSessionSchema, getSessionsQuerySchema, createTutorSessionSchema, rescheduleSessionSchema } from './sessions.validation';

const router = Router();
const sessionsController = new SessionsController();

// Parent/Student access
router.get('/', authenticate, validateQuery(getSessionsQuerySchema), sessionsController.getSessions);

// Tutor access
router.patch('/:id', authenticate, requireRole('TUTOR'), validateUUID('id'), validate(updateSessionSchema), sessionsController.updateSession);

// Tutor-only: Self-scheduling endpoints
router.post('/tutor/sessions', authenticate, requireRole('TUTOR'), validate(createTutorSessionSchema), sessionsController.createTutorSession);
router.patch('/tutor/sessions/:id/reschedule', authenticate, requireRole('TUTOR'), validateUUID('id'), validate(rescheduleSessionSchema), sessionsController.rescheduleTutorSession);

export default router;
