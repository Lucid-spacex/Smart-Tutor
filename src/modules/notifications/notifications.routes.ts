import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { NotificationSSEController } from './notification-sse.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { markByEntityAsReadSchema } from './notifications.validation';

const router = Router();
const notificationController = new NotificationController();
const notificationSSEController = new NotificationSSEController();

// Notification endpoints (exempt from Tier 3 limiter - handled in app.ts)
router.get('/unread-count', authenticate, notificationController.getUnreadCount);
router.get('/', authenticate, notificationController.getNotifications);
router.patch('/:id/read', authenticate, notificationController.markAsRead);
router.patch('/read-all', authenticate, notificationController.markAllAsRead);
router.patch('/read-by-entity', authenticate, validate(markByEntityAsReadSchema), notificationController.markByEntityAsRead);

// SSE endpoints (exempt from Tier 3 limiter with own connection cap - handled in app.ts)
router.post('/stream-ticket', authenticate, notificationSSEController.createStreamTicket);
router.get('/stream', notificationSSEController.streamNotifications);

export default router;
