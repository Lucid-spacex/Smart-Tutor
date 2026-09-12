import cron from 'node-cron';
import { runParentInactivityCheck } from './inactivity-check.job';
import { runAssignmentDueNotifications } from './assignment-due.job';
import { runExchangeRateCheck } from './exchange-rate-check.job';
import { runZoomRecordingSync } from './zoom-recording-sync.job';
import { logger } from '../config/logger';

export function initializeScheduler(): void {
  // Only start cron in non-test environments
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  logger.info('Initializing background cron jobs...');

  // 1. Daily at midnight (00:00) - Parent 7-day inactivity check
  cron.schedule('0 0 * * *', async () => {
    logger.info('Running scheduled job: Parent Inactivity Check');
    try {
      await runParentInactivityCheck();
    } catch (error) {
      logger.error({ error }, 'Error in parent inactivity check job');
    }
  });

  // 2. Daily at 06:00 AM - Assignment due-date notifications
  cron.schedule('0 6 * * *', async () => {
    logger.info('Running scheduled job: Assignment Due Date Notifications');
    try {
      await runAssignmentDueNotifications();
    } catch (error) {
      logger.error({ error }, 'Error in assignment due notification job');
    }
  });

  // 3. Daily at 12:00 PM - Exchange rate monitoring and drift alerts
  cron.schedule('0 12 * * *', async () => {
    logger.info('Running scheduled job: Exchange Rate Check');
    try {
      await runExchangeRateCheck();
    } catch (error) {
      logger.error({ error }, 'Error in exchange rate check job');
    }
  });

  // 4. Hourly - Zoom recording sync (polling fallback)
  cron.schedule('0 * * * *', async () => {
    logger.info('Running scheduled job: Zoom Recording Sync');
    try {
      await runZoomRecordingSync();
    } catch (error) {
      logger.error({ error }, 'Error in Zoom recording sync job');
    }
  });

  logger.info('Background cron jobs scheduled successfully');
}
