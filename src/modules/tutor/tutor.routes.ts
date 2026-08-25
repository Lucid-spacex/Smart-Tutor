import { Router } from 'express';
import { TutorController } from './tutor.controller';
import { validate } from '../../middleware/validation.middleware';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { createTutorProfileSchema, updateAvailabilitySchema } from './tutor.validation';

const router = Router();
const tutorController = new TutorController();

router.post('/tutor-profile', authenticate, requireRole('TUTOR'), validate(createTutorProfileSchema), tutorController.createTutorProfile);
router.patch('/tutor-profile/availability', authenticate, requireRole('TUTOR'), validate(updateAvailabilitySchema), tutorController.updateAvailability);
router.get('/tutor-profile', authenticate, requireRole('TUTOR'), tutorController.getTutorProfile);
router.get('/students', authenticate, requireRole('TUTOR'), tutorController.getAssignedStudents);
router.get('/sessions', authenticate, requireRole('TUTOR'), tutorController.getTutorSessions);

export default router;
