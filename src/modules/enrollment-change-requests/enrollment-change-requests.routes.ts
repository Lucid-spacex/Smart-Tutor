import { Router } from 'express';
import { EnrollmentChangeRequestController } from './enrollment-change-requests.controller';
import { validate, validateQuery } from '../../middleware/validation.middleware';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { validateUUID } from '../../middleware/uuid-validation.middleware';
import { z } from 'zod';

const router = Router();
const changeRequestController = new EnrollmentChangeRequestController();

// Validation schemas
const createChangeRequestSchema = z.object({
  enrollmentId: z.string().uuid('Invalid enrollment ID'),
  requestedValues: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    availableDays: z.array(z.string()).optional(),
    preferredStartHour: z.number().int().min(0).max(23).optional(),
    preferredEndHour: z.number().int().min(0).max(23).optional(),
    sessionFrequency: z.string().optional(),
  }),
});

const rejectChangeRequestSchema = z.object({
  reason: z.string().min(10, 'Rejection reason must be at least 10 characters'),
});

const changeRequestsQuerySchema = z.object({
  status: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

// Parent endpoints
router.post('/change-requests', authenticate, requireRole('PARENT'), validate(createChangeRequestSchema), changeRequestController.createChangeRequest);
router.get('/change-requests', authenticate, requireRole('PARENT'), changeRequestController.getChangeRequests);
router.patch('/change-requests/:id/cancel', authenticate, requireRole('PARENT'), validateUUID('id'), changeRequestController.cancelChangeRequest);

// Admin endpoints (mounted under /admin/change-requests)
const adminRouter = Router();
adminRouter.get('/', authenticate, requireRole('ADMIN'), validateQuery(changeRequestsQuerySchema), changeRequestController.getAdminChangeRequests);
adminRouter.get('/:id', authenticate, requireRole('ADMIN'), validateUUID('id'), changeRequestController.getAdminChangeRequest);
adminRouter.patch('/:id/approve', authenticate, requireRole('ADMIN'), validateUUID('id'), changeRequestController.approveChangeRequest);
adminRouter.patch('/:id/reject', authenticate, requireRole('ADMIN'), validateUUID('id'), validate(rejectChangeRequestSchema), changeRequestController.rejectChangeRequest);

export { adminRouter as adminChangeRequestsRouter };
export default router;
