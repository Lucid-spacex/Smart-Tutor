import { Router, Request, Response, NextFunction } from 'express';
import { MessagesController } from './messages.controller';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { validateUUID } from '../../middleware/uuid-validation.middleware';
import { createMessageSchema } from './messages.validation';
import { AuthRequest } from '../../types/express';

const router = Router();
const messagesController = new MessagesController();

// Middleware to block STUDENTS from messaging
const blockStudents = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role === 'STUDENT') {
    res.status(403).json({ error: 'Students are not permitted to send messages' });
    return;
  }
  next();
};

// Get admin contact for messaging (PARENT and TUTOR only)
router.get('/admin-contact', authenticate, requireRole('PARENT', 'TUTOR'), messagesController.getAdminContact);

// Get unread message count (STUDENTS blocked entirely)
router.get('/unread-count', authenticate, blockStudents, messagesController.getUnreadCount);

// Send message (allowed roles validated per permission graph in service)
// STUDENTS blocked entirely from messaging
router.post('/', authenticate, blockStudents, validate(createMessageSchema), messagesController.sendMessage);

// Get user's conversation threads (STUDENTS blocked entirely)
router.get('/threads', authenticate, blockStudents, messagesController.getThreads);

// Get messages in a thread (STUDENTS blocked entirely)
router.get('/threads/:threadId', authenticate, validateUUID('threadId'), blockStudents, messagesController.getThreadMessages);

// Mark thread messages as read (STUDENTS blocked entirely)
router.patch('/threads/:threadId/read', authenticate, validateUUID('threadId'), blockStudents, messagesController.markThreadAsRead);

export default router;
