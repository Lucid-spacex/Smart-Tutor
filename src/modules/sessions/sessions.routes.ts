import { Router } from 'express';
import { SessionsController } from './sessions.controller';
import { validate, validateQuery } from '../../middleware/validation.middleware';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { validateUUID } from '../../middleware/uuid-validation.middleware';
import { updateSessionSchema, getSessionsQuerySchema } from './sessions.validation';

const router = Router();
const sessionsController = new SessionsController();

// Parent/Student access
router.get('/', authenticate, validateQuery(getSessionsQuerySchema), sessionsController.getSessions);

// Tutor access
router.patch('/:id', authenticate, requireRole('TUTOR'), validateUUID('id'), validate(updateSessionSchema), sessionsController.updateSession);

// Recording access (all authenticated users with proper authorization)
router.get('/:id/recording', authenticate, validateUUID('id'), sessionsController.getRecording);

export default router;
