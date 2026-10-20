import { Router } from 'express';
import { TutorController } from '../tutor/tutor.controller';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { requireApprovedTutor } from '../../middleware/requireApprovedTutor.middleware';
import { validate } from '../../middleware/validation.middleware';
import { validateUUID } from '../../middleware/uuid-validation.middleware';
import { createScoredItemSchema, updateScoredItemSchema } from './scored-items.validation';

const router = Router();
const tutorController = new TutorController();

// Tutor-only scored item management
router.get('/students/:studentId/scored-items', authenticate, requireRole('TUTOR'), requireApprovedTutor, validateUUID('studentId'), tutorController.getStudentScoredItems);
router.post('/scored-items', authenticate, requireRole('TUTOR'), requireApprovedTutor, validate(createScoredItemSchema), tutorController.createScoredItem);
router.patch('/scored-items/:id', authenticate, requireRole('TUTOR'), requireApprovedTutor, validateUUID('id'), validate(updateScoredItemSchema), tutorController.updateScoredItem);
router.delete('/scored-items/:id', authenticate, requireRole('TUTOR'), requireApprovedTutor, validateUUID('id'), tutorController.deleteScoredItem);

export default router;
