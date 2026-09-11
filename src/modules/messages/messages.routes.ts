import { Router } from 'express';
import { MessagesController } from './messages.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { validateUUID } from '../../middleware/uuid-validation.middleware';
import { createMessageSchema } from './messages.validation';

const router = Router();
const messagesController = new MessagesController();

// Send message (allowed roles validated per permission graph in service)
router.post('/', authenticate, validate(createMessageSchema), messagesController.sendMessage);

// Get user's conversation threads
router.get('/threads', authenticate, messagesController.getThreads);

// Get messages in a thread
router.get('/threads/:threadId', authenticate, validateUUID('threadId'), messagesController.getThreadMessages);

// Mark thread messages as read
router.patch('/threads/:threadId/read', authenticate, validateUUID('threadId'), messagesController.markThreadAsRead);

export default router;
