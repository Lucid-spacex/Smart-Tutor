import { Router } from 'express';
import { TutorController } from './tutor.controller';
import { validate } from '../../middleware/validation.middleware';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { requireApprovedTutor } from '../../middleware/requireApprovedTutor.middleware';
import { validateUUID } from '../../middleware/uuid-validation.middleware';
import { createTutorProfileSchema, updateAvailabilitySchema } from './tutor.validation';
import { createTutorSessionSchema, rescheduleTutorSessionSchema } from '../sessions/sessions.validation';
import { createScoredItemSchema, updateScoredItemSchema } from '../scored-items/scored-items.validation';

const router = Router();
const tutorController = new TutorController();

// /tutor-profile endpoints - require approved tutor
router.post('/tutor-profile', authenticate, requireRole('TUTOR'), requireApprovedTutor, validate(createTutorProfileSchema), tutorController.createTutorProfile);
router.patch('/tutor-profile', authenticate, requireRole('TUTOR'), requireApprovedTutor, validate(updateAvailabilitySchema), tutorController.updateAvailability);
router.patch('/tutor-profile/availability-status', authenticate, requireRole('TUTOR'), requireApprovedTutor, tutorController.updateAvailabilityStatus);
router.get('/tutor-profile', authenticate, requireRole('TUTOR'), requireApprovedTutor, tutorController.getTutorProfile);

// /tutor/students & /tutor/sessions - require approved tutor
router.get('/students', authenticate, requireRole('TUTOR'), requireApprovedTutor, tutorController.getAssignedStudents);
router.get('/students/:studentId', authenticate, requireRole('TUTOR'), requireApprovedTutor, validateUUID('studentId'), tutorController.getStudentDetail);
router.get('/students/:studentId/performance', authenticate, requireRole('TUTOR'), requireApprovedTutor, validateUUID('studentId'), tutorController.getStudentPerformance);
router.get('/sessions', authenticate, requireRole('TUTOR'), requireApprovedTutor, tutorController.getTutorSessions);

// /tutor/sessions (tutor-only session management) - require approved tutor
router.post('/sessions', authenticate, requireRole('TUTOR'), requireApprovedTutor, validate(createTutorSessionSchema), tutorController.createTutorSession);
router.patch('/sessions/:id/reschedule', authenticate, requireRole('TUTOR'), requireApprovedTutor, validateUUID('id'), validate(rescheduleTutorSessionSchema), tutorController.rescheduleTutorSession);
router.delete('/sessions/:id', authenticate, requireRole('TUTOR'), requireApprovedTutor, validateUUID('id'), tutorController.deleteTutorSession);

export default router;
