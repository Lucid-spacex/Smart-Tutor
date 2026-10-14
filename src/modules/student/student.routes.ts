import { Router } from 'express';
import { StudentController } from './student.controller';
import { AttendanceController } from '../attendance/attendance.controller';
import { NotificationsController } from '../notifications/notifications.controller';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { validateUUID } from '../../middleware/uuid-validation.middleware';

const router = Router();
const studentController = new StudentController();
const attendanceController = new AttendanceController();
const notificationsController = new NotificationsController();

// Student-only routes
router.get('/me', authenticate, requireRole('STUDENT'), studentController.getStudentProfile);
router.get('/me/schedule', authenticate, requireRole('STUDENT'), studentController.getStudentSchedule);
router.get('/me/assignments', authenticate, requireRole('STUDENT'), studentController.getStudentAssignments);
router.get('/me/grades', authenticate, requireRole('STUDENT'), studentController.getStudentGrades);
router.get('/me/progress-reports', authenticate, requireRole('STUDENT'), studentController.getStudentProgressReports);
router.get('/me/performance', authenticate, requireRole('STUDENT'), studentController.getStudentPerformance);
// Alias to unified notifications endpoint
router.get('/me/notifications', authenticate, requireRole('STUDENT'), notificationsController.getNotifications);
router.get('/me/next-class', authenticate, requireRole('STUDENT'), studentController.getNextClass);
router.get('/me/attendance', authenticate, requireRole('STUDENT'), attendanceController.getMyAttendance);
router.get('/me/tutors', authenticate, requireRole('STUDENT'), studentController.getMyTutors);
router.get('/me/enrollments', authenticate, requireRole('STUDENT'), studentController.getMyEnrollments);
router.get('/me/enrollments/:enrollmentId/sessions', authenticate, requireRole('STUDENT'), validateUUID('enrollmentId'), studentController.getEnrollmentSessions);

export default router;