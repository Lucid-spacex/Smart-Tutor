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
// Note: These are mounted at /tutor-profile in app.ts, so paths are relative to that
router.post('/', authenticate, requireRole('TUTOR'), requireApprovedTutor, validate(createTutorProfileSchema), tutorController.createTutorProfile);
router.patch('/', authenticate, requireRole('TUTOR'), requireApprovedTutor, validate(updateAvailabilitySchema), tutorController.updateAvailability);
router.patch('/availability-status', authenticate, requireRole('TUTOR'), requireApprovedTutor, tutorController.updateAvailabilityStatus);
router.get('/', authenticate, requireRole('TUTOR'), requireApprovedTutor, tutorController.getTutorProfile);

// /tutor/students & /tutor/sessions - require approved tutor
router.get('/students', authenticate, requireRole('TUTOR'), requireApprovedTutor, tutorController.getAssignedStudents);
router.get('/students/:studentId', authenticate, requireRole('TUTOR'), requireApprovedTutor, validateUUID('studentId'), tutorController.getStudentDetail);
router.get('/students/:studentId/performance', authenticate, requireRole('TUTOR'), requireApprovedTutor, validateUUID('studentId'), tutorController.getStudentPerformance);
router.get('/sessions', authenticate, requireRole('TUTOR'), requireApprovedTutor, tutorController.getTutorSessions);

// /tutor/sessions (tutor-only session management) - require approved tutor
router.post('/sessions', authenticate, requireRole('TUTOR'), requireApprovedTutor, validate(createTutorSessionSchema), tutorController.createTutorSession);
router.patch('/sessions/:id/reschedule', authenticate, requireRole('TUTOR'), requireApprovedTutor, validateUUID('id'), validate(rescheduleTutorSessionSchema), tutorController.rescheduleTutorSession);
router.delete('/sessions/:id', authenticate, requireRole('TUTOR'), requireApprovedTutor, validateUUID('id'), tutorController.deleteTutorSession);

// /tutor/assignments/:id/submissions - tutor-specific submission management
router.get('/assignments/:id/submissions', authenticate, requireRole('TUTOR'), requireApprovedTutor, validateUUID('id'), tutorController.getAssignmentSubmissions);
router.post('/assignments/:id/submissions/:submissionId/score', authenticate, requireRole('TUTOR'), requireApprovedTutor, validateUUID('id'), validateUUID('submissionId'), tutorController.scoreSubmission);

export default router;
