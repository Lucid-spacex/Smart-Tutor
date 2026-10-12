import { Router } from 'express';
import { NotificationsController } from './notifications.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validateUUID } from '../../middleware/uuid-validation.middleware';

const router = Router();
const notificationsController = new NotificationsController();

// Authenticated users can view their own notifications
router.get('/', authenticate, notificationsController.getNotifications);

// Get unread count (lightweight endpoint for polling)
router.get('/unread-count', authenticate, notificationsController.getUnreadCount);

// Mark notification as read
router.patch('/:id/read', authenticate, validateUUID('id'), notificationsController.markAsRead);

// Mark all notifications as read
router.patch('/read-all', authenticate, notificationsController.markAllAsRead);

// Delete notification (soft delete)
router.delete('/:id', authenticate, validateUUID('id'), notificationsController.deleteNotification);

export default router;
