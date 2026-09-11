import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { MessagesService } from './messages.service';

export class MessagesController {
  private messagesService: MessagesService;

  constructor() {
    this.messagesService = new MessagesService();
  }

  sendMessage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const message = await this.messagesService.sendMessage(req.user!.userId, req.body);
      res.status(201).json(message);
    } catch (error) {
      next(error);
    }
  };

  getThreads = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const threads = await this.messagesService.getThreads(req.user!.userId);
      res.json(threads);
    } catch (error) {
      next(error);
    }
  };

  getThreadMessages = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const messages = await this.messagesService.getThreadMessages(req.params.threadId, req.user!.userId);
      res.json(messages);
    } catch (error) {
      next(error);
    }
  };

  markThreadAsRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.messagesService.markThreadAsRead(req.params.threadId, req.user!.userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
