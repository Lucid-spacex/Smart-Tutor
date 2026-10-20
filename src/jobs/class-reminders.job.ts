import { ClassRemindersService } from '../modules/class-reminders/class-reminders.service';
import { logger } from '../config/logger';

const classRemindersService = new ClassRemindersService();

export async function runClassRemindersJob() {
  logger.info('Running class reminders job');
  try {
    await classRemindersService.sendClassReminders();
    logger.info('Class reminders job completed successfully');
  } catch (error) {
    logger.error({ error }, 'Error in class reminders job');
    throw error;
  }
}
