import { Router } from 'express';
import { NotificationsController } from './notifications.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validateUUID } from '../../middleware/uuid-validation.middleware';

const router = Router();
const notificationsController = new NotificationsController();

// Authenticated users can view their own notifications
router.get('/', authenticate, notificationsController.getNotifications);

// Mark notification as read
router.patch('/:id/read', authenticate, validateUUID('id'), notificationsController.markAsRead);

export default router;
