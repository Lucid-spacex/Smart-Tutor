import { Router } from 'express';
import { ClassRemindersController } from './class-reminders.controller';
import { validateQuery } from '../../middleware/validation.middleware';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { requireApprovedTutor } from '../../middleware/requireApprovedTutor.middleware';
import { z } from 'zod';

const router = Router();
const classRemindersController = new ClassRemindersController();

// Validation schemas
const upcomingClassesQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

const classScheduleQuerySchema = z.object({
  tutorId: z.string().uuid('Invalid tutor ID').optional(),
  status: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

// Tutor endpoint
router.get('/upcoming-classes', authenticate, requireRole('TUTOR'), requireApprovedTutor, validateQuery(upcomingClassesQuerySchema), classRemindersController.getTutorUpcomingClasses);

// Admin endpoint (mounted under /admin/class-schedule)
const adminRouter = Router();
adminRouter.get('/', authenticate, requireRole('ADMIN'), validateQuery(classScheduleQuerySchema), classRemindersController.getAdminClassSchedule);

export { adminRouter as adminClassScheduleRouter };
export default router;
