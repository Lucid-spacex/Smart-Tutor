import prisma from '../config/database';
import { GoogleCalendarProvider } from '../modules/meetings/google-calendar.provider';
import { logger } from '../config/logger';

const meetingProvider = new GoogleCalendarProvider();

export async function runGoogleRecordingSync() {
  logger.info('Running Google Meet recording sync job');
  try {
    // Get sessions completed in the last 24 hours that have a googleEventId but no googleDriveFileId
    const sessions = await prisma.session.findMany({
      where: {
        status: 'COMPLETED',
        googleEventId: { not: null },
        googleDriveFileId: null,
        scheduledAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      take: 50, // Limit to 50 per run
    });

    logger.info(`Found ${sessions.length} sessions to check for recordings`);

    for (const session of sessions) {
      try {
        if (session.googleEventId) {
          const recordingUrl = await meetingProvider.getRecording(session.googleEventId);

          if (recordingUrl) {
            // Update session with Drive file ID (extract from URL or store URL)
            await prisma.session.update({
              where: { id: session.id },
              data: {
                googleDriveFileId: recordingUrl, // For now, store the URL
              },
            });

            logger.info(`Recording found for session ${session.id}`);
          }
        }
      } catch (error) {
        logger.error({ error, sessionId: session.id }, 'Error checking recording for session');
      }
    }

    logger.info('Google Meet recording sync job completed successfully');
  } catch (error) {
    logger.error({ error }, 'Error in Google Meet recording sync job');
    throw error;
  }
}
