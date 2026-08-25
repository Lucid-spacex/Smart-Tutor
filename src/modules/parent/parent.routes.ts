import { Router } from 'express';
import { ParentController } from './parent.controller';
import { authenticate, requireRole } from '../../middleware/auth.middleware';

const router = Router();
const parentController = new ParentController();

router.get('/me', authenticate, requireRole('PARENT'), parentController.getProfile);

export default router;
