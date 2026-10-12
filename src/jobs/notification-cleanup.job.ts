import { NotificationsService } from '../modules/notifications/notifications.service';
import { logger } from '../config/logger';

const notificationsService = new NotificationsService();

export async function runNotificationCleanup() {
  logger.info('Running notification cleanup job');
  try {
    const result = await notificationsService.cleanupOldNotifications();
    logger.info({ count: result.count }, 'Notification cleanup completed');
  } catch (error) {
    logger.error({ error }, 'Error in notification cleanup job');
  }
}
