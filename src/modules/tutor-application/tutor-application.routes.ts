import { Router } from 'express';
import { TutorApplicationController } from './tutor-application.controller';
import { validate } from '../../middleware/validation.middleware';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { requireApprovedTutor } from '../../middleware/requireApprovedTutor.middleware';
import { updateTutorApplicationSchema, submitTutorApplicationSchema } from './tutor-application.validation';
import { tier2RateLimit } from '../../middleware/rate-limit.middleware';
import multer from 'multer';

const router = Router();
const tutorApplicationController = new TutorApplicationController();

// Configure multer for file uploads (memory storage for Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});

// All tutor application routes require authentication and TUTOR role
// They also bypass the requireApprovedTutor middleware since PENDING_VETTING tutors need access

// GET /tutor-application - Get draft application (requires TUTOR role, not approved)
router.get('/', authenticate, requireRole('TUTOR'), tier2RateLimit, tutorApplicationController.getApplication);

// PATCH /tutor-application - Partial autosave (requires TUTOR role, not approved)
router.patch('/', authenticate, requireRole('TUTOR'), tier2RateLimit, validate(updateTutorApplicationSchema), tutorApplicationController.updateApplication);

// POST /tutor-application/documents - Upload document (requires TUTOR role, not approved)
router.post('/documents', authenticate, requireRole('TUTOR'), tier2RateLimit, upload.single('file'), tutorApplicationController.uploadDocument);

// GET /tutor-application/documents/:id - Get signed URL for document download
router.get('/documents/:id', authenticate, tier2RateLimit, tutorApplicationController.getDocumentUrl);

// DELETE /tutor-application/documents/:id - Delete document (requires TUTOR role, not approved)
router.delete('/documents/:id', authenticate, requireRole('TUTOR'), tier2RateLimit, tutorApplicationController.deleteDocument);

// POST /tutor-application/submit - Submit application (requires TUTOR role, not approved)
router.post('/submit', authenticate, requireRole('TUTOR'), tier2RateLimit, validate(submitTutorApplicationSchema), tutorApplicationController.submitApplication);

export default router;
