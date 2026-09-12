import { ZoomService } from '../services/zoom.service';
import { logger } from '../config/logger';

/**
 * Hourly job: Zoom recording sync (polling fallback)
 * Checks for completed sessions without recordings and polls Zoom API
 */
export async function runZoomRecordingSync(): Promise<{ checked: number; updated: number }> {
  const zoomService = new ZoomService();
  
  try {
    const result = await zoomService.pollForRecordings();
    logger.info(result, 'Zoom recording sync completed');
    return result;
  } catch (error) {
    logger.error({ error }, 'Error in Zoom recording sync job');
    return { checked: 0, updated: 0 };
  }
}
