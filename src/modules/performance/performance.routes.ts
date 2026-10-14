import { Router } from 'express';
import { PerformanceController } from './performance.controller';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { validateUUID } from '../../middleware/uuid-validation.middleware';

const router = Router();
const performanceController = new PerformanceController();

// Student performance
router.get('/me/performance', authenticate, requireRole('STUDENT'), performanceController.getMyPerformance);

// Parent viewing child's performance
router.get('/students/:id/performance', authenticate, requireRole('PARENT'), validateUUID('id'), performanceController.getStudentPerformance);

// Tutor viewing assigned student's performance
router.get('/tutor/students/:studentId/performance', authenticate, requireRole('TUTOR'), validateUUID('studentId'), performanceController.getStudentPerformance);

// Admin viewing any student's performance
router.get('/admin/students/:id/performance', authenticate, requireRole('ADMIN'), validateUUID('id'), performanceController.getStudentPerformance);

export default router;
