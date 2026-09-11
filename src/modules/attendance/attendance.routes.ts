import { Router } from 'express';
import { AttendanceController } from './attendance.controller';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { validateUUID } from '../../middleware/uuid-validation.middleware';

const router = Router();
const attendanceController = new AttendanceController();

// Student's own attendance (shorthand)
router.get('/student/me/attendance', authenticate, requireRole('STUDENT'), attendanceController.getMyAttendance);

// Get specific student attendance (handles all role authorization in service)
router.get('/students/:id/attendance', authenticate, validateUUID('id'), attendanceController.getStudentAttendance);

export default router;