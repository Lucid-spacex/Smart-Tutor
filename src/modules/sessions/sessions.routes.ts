import { Router } from 'express';
import { SessionsController } from './sessions.controller';
import { validate, validateQuery } from '../../middleware/validation.middleware';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { updateSessionSchema, getSessionsQuerySchema } from './sessions.validation';

const router = Router();
const sessionsController = new SessionsController();

router.get('/', authenticate, validateQuery(getSessionsQuerySchema), sessionsController.getSessions);
router.patch('/:id', authenticate, requireRole('TUTOR'), validate(updateSessionSchema), sessionsController.updateSession);

export default router;
