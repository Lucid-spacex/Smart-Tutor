import { Router } from 'express';
import { MessagesController } from './messages.controller';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { validateUUID } from '../../middleware/uuid-validation.middleware';
import { createMessageSchema } from './messages.validation';

const router = Router();
const messagesController = new MessagesController();

// Send message (allowed roles validated per permission graph in service)
// STUDENTS blocked entirely from messaging
router.post('/', authenticate, (req, res, next) => {
  if (req.user?.role === 'STUDENT') {
    return res.status(403).json({ error: 'Students are not permitted to send messages' });
  }
  next();
}, validate(createMessageSchema), messagesController.sendMessage);

// Get user's conversation threads (STUDENTS blocked entirely)
router.get('/threads', authenticate, (req, res, next) => {
  if (req.user?.role === 'STUDENT') {
    return res.status(403).json({ error: 'Students are not permitted to access messaging' });
  }
  next();
}, messagesController.getThreads);

// Get messages in a thread (STUDENTS blocked entirely)
router.get('/threads/:threadId', authenticate, validateUUID('threadId'), (req, res, next) => {
  if (req.user?.role === 'STUDENT') {
    return res.status(403).json({ error: 'Students are not permitted to access messaging' });
  }
  next();
}, messagesController.getThreadMessages);

// Mark thread messages as read (STUDENTS blocked entirely)
router.patch('/threads/:threadId/read', authenticate, validateUUID('threadId'), (req, res, next) => {
  if (req.user?.role === 'STUDENT') {
    return res.status(403).json({ error: 'Students are not permitted to access messaging' });
  }
  next();
}, messagesController.markThreadAsRead);

// Get admin contact for messaging (PARENT and TUTOR only)
router.get('/admin-contact', authenticate, requireRole('PARENT', 'TUTOR'), messagesController.getAdminContact);

export default router;
