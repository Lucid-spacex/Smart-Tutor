import { Router } from 'express';
import { AdminController } from './admin.controller';
import { AdminSubjectsController } from './admin-subjects.controller';
import { ComplaintsController } from '../complaints/complaints.controller';
import { validate, validateQuery } from '../../middleware/validation.middleware';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { validateUUID } from '../../middleware/uuid-validation.middleware';
import { updateTutorVettingSchema, assignTutorSchema, getTutorsQuerySchema, getStudentsQuerySchema, updateEnrollmentPricingSchema, updateEnrollmentPricingOverrideSchema, createSessionSchema, rescheduleSessionSchema, getUnmatchedEnrollmentsQuerySchema, createSubjectSchema, updateSubjectSchema, upsertSubjectPriceSchema } from './admin.validation';
import { resolveComplaintSchema } from '../complaints/complaints.validation';

const router = Router();
const adminController = new AdminController();
const adminSubjectsController = new AdminSubjectsController();
const complaintsController = new ComplaintsController();

// Tutors management
router.get('/tutors/pending', authenticate, requireRole('ADMIN'), adminController.getPendingTutors);
router.get('/tutors', authenticate, requireRole('ADMIN'), validateQuery(getTutorsQuerySchema), adminController.getTutors);
router.patch('/tutors/:id/vetting', authenticate, requireRole('ADMIN'), validateUUID('id'), validate(updateTutorVettingSchema), adminController.updateTutorVetting);

// Enrollments & Pricing
router.get('/enrollments/unmatched', authenticate, requireRole('ADMIN'), validateQuery(getUnmatchedEnrollmentsQuerySchema), adminController.getUnmatchedEnrollments);
router.get('/enrollments/:id/pricing', authenticate, requireRole('ADMIN'), validateUUID('id'), adminController.getEnrollmentPricingOverride);
router.patch('/enrollments/:id/pricing', authenticate, requireRole('ADMIN'), validateUUID('id'), validate(updateEnrollmentPricingOverrideSchema), adminController.updateEnrollmentPricingOverride);
router.patch('/enrollments/:id/assign-tutor', authenticate, requireRole('ADMIN'), validateUUID('id'), validate(assignTutorSchema), adminController.assignTutor);
router.get('/enrollments/:id/suggested-tutors', authenticate, requireRole('ADMIN'), validateUUID('id'), adminController.getSuggestedTutors);

// Subjects & Per-Grade Pricing
router.get('/subjects', authenticate, requireRole('ADMIN'), adminSubjectsController.getSubjects);
router.post('/subjects', authenticate, requireRole('ADMIN'), validate(createSubjectSchema), adminSubjectsController.createSubject);
router.patch('/subjects/:id', authenticate, requireRole('ADMIN'), validateUUID('id'), validate(updateSubjectSchema), adminSubjectsController.updateSubject);
router.put('/subjects/:id/prices/:gradeBandTier', authenticate, requireRole('ADMIN'), validateUUID('id'), validate(upsertSubjectPriceSchema), adminSubjectsController.upsertSubjectPrice);
router.delete('/subjects/:id', authenticate, requireRole('ADMIN'), validateUUID('id'), adminSubjectsController.deleteSubject);

// Exchange Rate
router.get('/exchange-rate/current', authenticate, requireRole('ADMIN'), adminController.getCurrentExchangeRate);

// Payments & Reports
router.get('/payments', authenticate, requireRole('ADMIN'), adminController.getPayments);
router.get('/payments/:id', authenticate, requireRole('ADMIN'), validateUUID('id'), adminController.getPaymentById);
router.get('/payments/summary', authenticate, requireRole('ADMIN'), adminController.getPaymentsSummary);
router.get('/payments/failed', authenticate, requireRole('ADMIN'), adminController.getFailedPayments);
router.get('/reports/overview', authenticate, requireRole('ADMIN'), adminController.getOverviewReport);

// Students
router.get('/students', authenticate, requireRole('ADMIN'), validateQuery(getStudentsQuerySchema), adminController.getStudents);
router.patch('/students/:id/regenerate-pin', authenticate, requireRole('ADMIN'), validateUUID('id'), adminController.regenerateStudentPin);

// Parent Directory
router.get('/parents', authenticate, requireRole('ADMIN'), adminController.getParents);
router.get('/parents/:id', authenticate, requireRole('ADMIN'), validateUUID('id'), adminController.getParentById);

// Suspended Users Management
router.get('/users/suspended', authenticate, requireRole('ADMIN'), adminController.getSuspendedUsers);
router.patch('/users/:id/reactivate', authenticate, requireRole('ADMIN'), validateUUID('id'), adminController.reactivateUser);

// Sessions
router.post('/sessions', authenticate, requireRole('ADMIN'), validate(createSessionSchema), adminController.createSession);
router.patch('/sessions/:id/reschedule', authenticate, requireRole('ADMIN'), validateUUID('id'), validate(rescheduleSessionSchema), adminController.rescheduleSession);

// Grades Approval Workflow
router.get('/grades/pending', authenticate, requireRole('ADMIN'), adminController.getPendingGrades);
router.patch('/grades/:id/approve', authenticate, requireRole('ADMIN'), validateUUID('id'), adminController.approveGrade);
router.patch('/grades/:id/reject', authenticate, requireRole('ADMIN'), validateUUID('id'), adminController.rejectGrade);

// Complaints Resolution
router.patch('/complaints/:id/resolve', authenticate, requireRole('ADMIN'), validateUUID('id'), validate(resolveComplaintSchema), complaintsController.resolveComplaint);

export default router;
