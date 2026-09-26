import prisma from '../config/database';
import { logger } from '../config/logger';
import crypto from 'crypto';

/**
 * Zoom Recording Service
 * Handles fetching and storing Zoom session recordings
 * Supports both webhook and polling approaches
 */
export class ZoomService {
  private zoomAccountId: string;
  private zoomClientId: string;
  private zoomClientSecret: string;
  private zoomBaseUrl = 'https://api.zoom.us/v2';

  constructor() {
    this.zoomAccountId = process.env.ZOOM_ACCOUNT_ID || '';
    this.zoomClientId = process.env.ZOOM_CLIENT_ID || '';
    this.zoomClientSecret = process.env.ZOOM_CLIENT_SECRET || '';

    if (!this.zoomAccountId || !this.zoomClientId || !this.zoomClientSecret) {
      logger.warn('Zoom credentials not configured, recording sync will be disabled');
    }
  }

  /**
   * Get Zoom access token using Server-to-Server OAuth
   */
  private async getAccessToken(): Promise<string> {
    try {
      const response = await fetch('https://zoom.us/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'account_credentials',
          account_id: this.zoomAccountId,
        }),
        auth: {
          username: this.zoomClientId,
          password: this.zoomClientSecret,
        },
      } as any);

      if (!response.ok) {
        throw new Error(`Zoom OAuth failed: ${response.status}`);
      }

      const data = await response.json() as any;
      return data.access_token;
    } catch (error) {
      logger.error({ error }, 'Failed to get Zoom access token');
      throw error;
    }
  }

  /**
   * Fetch recording for a specific meeting
   */
  async fetchRecording(meetingId: string): Promise<{ recordingUrl: string | null; status: string }> {
    if (!this.zoomAccountId || !this.zoomClientId || !this.zoomClientSecret) {
      logger.warn('Zoom credentials not configured, skipping recording fetch');
      return { recordingUrl: null, status: 'FAILED' };
    }

    try {
      const accessToken = await this.getAccessToken();
      const response = await fetch(
        `${this.zoomBaseUrl}/meetings/${meetingId}/recordings`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          logger.info({ meetingId }, 'Recording not found yet (may still be processing)');
          return { recordingUrl: null, status: 'PROCESSING' };
        }
        throw new Error(`Zoom API failed: ${response.status}`);
      }

      const data = await response.json() as any;
      
      // Get the first recording URL (video/mp4)
      if (data.recording_files && data.recording_files.length > 0) {
        const videoRecording = data.recording_files.find(
          (file: any) => file.file_type === 'MP4' || file.file_type === 'VIDEO'
        );
        
        if (videoRecording) {
          logger.info({ meetingId, downloadUrl: videoRecording.download_url }, 'Recording found');
          return { recordingUrl: videoRecording.download_url, status: 'AVAILABLE' };
        }
      }

      logger.info({ meetingId }, 'No video recording found');
      return { recordingUrl: null, status: 'FAILED' };
    } catch (error) {
      logger.error({ error, meetingId }, 'Failed to fetch Zoom recording');
      return { recordingUrl: null, status: 'FAILED' };
    }
  }

  /**
   * Update session with recording information
   */
  async updateSessionRecording(sessionId: string, recordingUrl: string | null, status: string): Promise<void> {
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        recordingUrl,
        recordingStatus: status as any,
      },
    });

    logger.info({ sessionId, recordingUrl, status }, 'Session recording updated');
  }

  /**
   * Verify Zoom webhook signature
   */
  verifyWebhookSignature(signature: string, timestamp: string, rawBody: string): boolean {
    const webhookSecret = process.env.ZOOM_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.warn('ZOOM_WEBHOOK_SECRET not configured, skipping signature verification');
      return false;
    }

    const message = `v0:${timestamp}:${rawBody}`;
    const hash = crypto
      .createHmac('sha256', webhookSecret)
      .update(message)
      .digest('hex');

    const expectedSignature = `v0=${hash}`;
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Create a Zoom meeting
   */
  async createMeeting(scheduledAt: Date, durationMinutes: number): Promise<{ zoomLink: string; zoomMeetingId: string }> {
    if (!this.zoomAccountId || !this.zoomClientId || !this.zoomClientSecret) {
      logger.warn('Zoom credentials not configured, meeting creation disabled');
      return { zoomLink: '', zoomMeetingId: '' };
    }

    try {
      const accessToken = await this.getAccessToken();
      
      const response = await fetch(`${this.zoomBaseUrl}/users/me/meetings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: 'Smart Tutor Session',
          type: 2, // Scheduled meeting
          start_time: scheduledAt.toISOString(),
          duration: durationMinutes,
          settings: {
            host_video: true,
            participant_video: true,
            join_before_host: false,
            mute_upon_entry: false,
            watermark: false,
            use_pmi: false,
            approval_type: 2, // No approval required
            audio: 'both',
            auto_recording: 'cloud',
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Zoom meeting creation failed: ${response.status}`);
      }

      const data = await response.json() as any;
      
      logger.info({ meetingId: data.id, joinUrl: data.join_url }, 'Zoom meeting created successfully');
      
      return {
        zoomLink: data.join_url,
        zoomMeetingId: data.id.toString(),
      };
    } catch (error) {
      logger.error({ error }, 'Failed to create Zoom meeting');
      throw error;
    }
  }

  /**
   * Handle Zoom recording.completed webhook event
   */
  async handleRecordingCompleted(payload: any): Promise<void> {
    const meetingId = payload.object.id;
    const downloadUrl = payload.object.download_url;

    // Find session by meeting ID
    const session = await prisma.session.findFirst({
      where: { zoomMeetingId: meetingId },
    });

    if (!session) {
      logger.warn({ meetingId }, 'Session not found for Zoom meeting');
      return;
    }

    await this.updateSessionRecording(session.id, downloadUrl, 'AVAILABLE');
    logger.info({ sessionId: session.id, meetingId }, 'Recording marked as available via webhook');
  }

  /**
   * Poll for recordings (fallback method)
   * Checks sessions that are completed but don't have recordings yet
   */
  async pollForRecordings(): Promise<{ checked: number; updated: number }> {
    // Find completed sessions without available recordings
    const sessions = await prisma.session.findMany({
      where: {
        status: 'COMPLETED',
        recordingStatus: { in: ['NONE', 'PROCESSING'] },
        zoomMeetingId: { not: null },
      },
      take: 50, // Limit to avoid overwhelming the API
    });

    let updated = 0;

    for (const session of sessions) {
      if (!session.zoomMeetingId) continue;

      const { recordingUrl, status } = await this.fetchRecording(session.zoomMeetingId);
      
      if (recordingUrl || status === 'FAILED') {
        await this.updateSessionRecording(session.id, recordingUrl, status);
        updated++;
      } else if (status === 'PROCESSING') {
        // Mark as processing if not already
        if (session.recordingStatus !== 'PROCESSING') {
          await this.updateSessionRecording(session.id, null, 'PROCESSING');
        }
      }
    }

    logger.info({ checked: sessions.length, updated }, 'Zoom recording poll completed');
    return { checked: sessions.length, updated };
  }
}