import { Router } from 'express';
import { ParentController } from './parent.controller';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { validateUUID } from '../../middleware/uuid-validation.middleware';

const router = Router();
const parentController = new ParentController();

router.get('/me', authenticate, requireRole('PARENT'), parentController.getProfile);
router.get('/students/:id/performance', authenticate, requireRole('PARENT'), validateUUID('id'), parentController.getStudentPerformance);

export default router;
