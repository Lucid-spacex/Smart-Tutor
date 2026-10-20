import { Response, NextFunction } from 'express';
import { NotificationCoreService } from './notification-core.service';
import { AuthRequest } from '../../types/express';
import { NotificationCategory } from '@prisma/client';

export class NotificationController {
  private notificationService: NotificationCoreService;

  constructor() {
    this.notificationService = new NotificationCoreService();
  }

  getUnreadCount = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const result = await this.notificationService.getUnreadCount(userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getNotifications = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const filters = {
        category: req.query.category as NotificationCategory,
        isRead: req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined,
        entityType: req.query.entityType as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      };

      const result = await this.notificationService.getNotifications(userId, filters);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  markAsRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      await this.notificationService.markAsRead(id, userId);
      res.status(200).json({ message: 'Notification marked as read' });
    } catch (error: any) {
      if (error.message === 'Notification not found') {
        res.status(404).json({ error: 'Notification not found' });
        return;
      }
      if (error.message === 'Not authorized to mark this notification as read') {
        res.status(403).json({ error: 'Not authorized' });
        return;
      }
      next(error);
    }
  };

  markAllAsRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const category = req.query.category as NotificationCategory;
      await this.notificationService.markAllAsRead(userId, category);
      res.status(200).json({ message: 'All notifications marked as read' });
    } catch (error) {
      next(error);
    }
  };

  markByEntityAsRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { entityType, entityId } = req.body;
      await this.notificationService.markByEntityAsRead(userId, entityType, entityId);
      res.status(200).json({ message: 'Notifications marked as read' });
    } catch (error) {
      next(error);
    }
  };
}
