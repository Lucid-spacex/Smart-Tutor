import prisma from '../../config/database';
import { logger } from '../../config/logger';
import { NotificationCategory, NotificationType } from '@prisma/client';
import { notificationBroadcaster } from './in-memory-broadcaster';
import { NotificationMessage } from './broadcaster.interface';

export interface NotifyOptions {
  recipientIds?: string[];
  recipientRole?: 'ADMIN' | 'PARENT' | 'TUTOR' | 'STUDENT';
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  dedupeKey?: string;
  // Data that should never be exposed to unauthorized recipients
  sensitiveData?: {
    prices?: boolean; // Should not go to students or tutors
    unapprovedGrades?: boolean; // Should not go to parents or students
    parentContact?: boolean; // Should not go to tutors
  };
}

export class NotificationCoreService {
  /**
   * Central notification method - best-effort, never fails the calling action
   * Runs after the main transaction commits
   */
  async notify(options: NotifyOptions): Promise<void> {
    const { recipientIds, recipientRole, type, category, title, body, entityType, entityId, dedupeKey, sensitiveData } = options;

    // Build recipient list
    let userIds: string[] = [];

    if (recipientIds) {
      userIds = recipientIds;
    } else if (recipientRole === 'ADMIN') {
      // Fan out to all active admins - each gets their own copy
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', status: 'ACTIVE' },
        select: { id: true },
      });
      userIds = admins.map(a => a.id);
    } else {
      // For other roles, the caller must provide specific recipientIds
      logger.warn({ recipientRole }, 'Notification requested with recipientRole but no recipientIds');
      return;
    }

    if (userIds.length === 0) {
      logger.warn({ recipientRole, recipientIds }, 'No recipients for notification');
      return;
    }

    // Create notifications in parallel with error handling
    const promises = userIds.map(userId => 
      this.createNotificationForUser(userId, {
        type,
        category,
        title,
        body,
        entityType,
        entityId,
        dedupeKey,
        sensitiveData,
      })
    );

    await Promise.allSettled(promises);
  }

  /**
   * Create a single notification for a user with deduplication and filtering
   */
  private async createNotificationForUser(
    userId: string,
    options: {
      type: NotificationType;
      category: NotificationCategory;
      title: string;
      body: string;
      entityType?: string;
      entityId?: string;
      dedupeKey?: string;
      sensitiveData?: {
        prices?: boolean;
        unapprovedGrades?: boolean;
        parentContact?: boolean;
      };
    }
  ): Promise<void> {
    try {
      // Check if user exists and is active
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, status: true },
      });

      if (!user || user.status !== 'ACTIVE') {
        return; // Skip inactive or non-existent users
      }

      // Filter sensitive data based on user role
      if (options.sensitiveData) {
        if (options.sensitiveData.prices && (user.role === 'STUDENT' || user.role === 'TUTOR')) {
          logger.debug({ userId, role: user.role }, 'Skipping price notification to student/tutor');
          return;
        }

        if (options.sensitiveData.unapprovedGrades && (user.role === 'PARENT' || user.role === 'STUDENT')) {
          logger.debug({ userId, role: user.role }, 'Skipping unapproved grade notification to parent/student');
          return;
        }

        if (options.sensitiveData.parentContact && user.role === 'TUTOR') {
          logger.debug({ userId, role: user.role }, 'Skipping parent contact notification to tutor');
          return;
        }
      }

      // Check for duplicate with dedupeKey (enforced by DB unique constraint)
      if (options.dedupeKey) {
        const existing = await prisma.notification.findFirst({
          where: {
            userId,
            dedupeKey: options.dedupeKey,
          },
        });

        if (existing) {
          logger.debug({ userId, dedupeKey: options.dedupeKey }, 'Duplicate notification skipped');
          return;
        }
      }

      const notification = await prisma.notification.create({
        data: {
          userId,
          type: options.type,
          category: options.category,
          title: options.title,
          body: options.body,
          entityType: options.entityType,
          entityId: options.entityId,
          dedupeKey: options.dedupeKey,
        },
      });

      logger.debug({ userId, type: options.type }, 'Notification created');

      // Push to SSE broadcaster
      const message: NotificationMessage = {
        id: notification.id,
        type: notification.type,
        category: notification.category,
        title: notification.title,
        body: notification.body,
        entityType: notification.entityType || undefined,
        entityId: notification.entityId || undefined,
        isRead: notification.isRead,
        createdAt: notification.createdAt.toISOString(),
      };

      await notificationBroadcaster.broadcast(userId, message);
    } catch (error) {
      // Best-effort: log error but don't throw
      // This includes constraint violations for duplicate dedupeKey
      logger.error({ error, userId, type: options.type }, 'Failed to create notification');
    }
  }

  /**
   * Get unread count for authenticated user
   */
  async getUnreadCount(userId: string): Promise<{ total: number; byCategory: Record<string, number> }> {
    const [total, byCategoryRaw] = await Promise.all([
      prisma.notification.count({
        where: {
          userId,
          isRead: false,
        },
      }),
      prisma.notification.groupBy({
        by: ['category'],
        where: {
          userId,
          isRead: false,
        },
        _count: true,
      }),
    ]);

    const byCategory: Record<string, number> = {};
    for (const item of byCategoryRaw) {
      byCategory[item.category] = item._count;
    }

    return { total, byCategory };
  }

  /**
   * Get notifications with filters
   */
  async getNotifications(
    userId: string,
    filters: {
      category?: NotificationCategory;
      isRead?: boolean;
      entityType?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { category, isRead, entityType, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = { userId };

    if (category !== undefined) {
      where.category = category;
    }

    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    if (entityType !== undefined) {
      where.entityType = entityType;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Math.min(limit, 100),
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      page,
      limit,
      total,
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new Error('Not authorized to mark this notification as read');
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Mark all notifications as read (optionally by category)
   */
  async markAllAsRead(userId: string, category?: NotificationCategory): Promise<void> {
    const where: any = {
      userId,
      isRead: false,
    };

    if (category !== undefined) {
      where.category = category;
    }

    await prisma.notification.updateMany({
      where,
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Mark notifications by entity as read
   */
  async markByEntityAsRead(userId: string, entityType: string, entityId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        userId,
        entityType,
        entityId,
        isRead: false,
      },
      data: { isRead: true, readAt: new Date() },
    });
  }
}
