import { Router } from 'express';
import { StudentsController } from './students.controller';
import { AttendanceController } from '../attendance/attendance.controller';
import { validate } from '../../middleware/validation.middleware';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { validateUUID } from '../../middleware/uuid-validation.middleware';
import { createStudentSchema } from './students.validation';

const router = Router();
const studentsController = new StudentsController();
const attendanceController = new AttendanceController();

// Parent-only routes
router.post('/', authenticate, requireRole('PARENT'), validate(createStudentSchema), studentsController.createStudent);
router.get('/', authenticate, requireRole('PARENT'), studentsController.getStudents);
router.get('/:id', authenticate, requireRole('PARENT'), validateUUID('id'), studentsController.getStudentById);
router.get('/:id/activity', authenticate, requireRole('PARENT'), validateUUID('id'), studentsController.getStudentActivity);
router.post('/:id/regenerate-password', authenticate, requireRole('PARENT'), validateUUID('id'), studentsController.regeneratePassword);

// Student attendance routes
router.get('/:id/attendance', authenticate, validateUUID('id'), attendanceController.getStudentAttendance);

export default router;
