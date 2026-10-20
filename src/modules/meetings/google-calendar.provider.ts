import { google } from 'googleapis';
import { MeetingProvider } from './meeting-provider.interface';
import { logger } from '../../config/logger';

export class GoogleCalendarProvider implements MeetingProvider {
  private calendar: any;
  private drive: any;

  constructor() {
    // Initialize Google Calendar API with service account
    const auth = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      undefined,
      process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/drive.readonly'],
      process.env.GOOGLE_ORGANIZER_EMAIL
    );

    this.calendar = google.calendar({ version: 'v3', auth });
    this.drive = google.drive({ version: 'v3', auth });
  }

  async createMeeting(startTime: string, duration: number, title: string, description?: string): Promise<{
    meetingUrl: string;
    eventId: string;
  }> {
    try {
      const startDate = new Date(startTime);
      const endDate = new Date(startDate.getTime() + duration * 60000);

      const event = {
        summary: title,
        description: description || '',
        start: {
          dateTime: startDate.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: 'UTC',
        },
        conferenceData: {
          createRequest: {
            requestId: `${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet',
            },
          },
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        resource: event,
        conferenceDataVersion: 1,
      });

      const meetingUrl = response.data.conferenceData?.entryPoints?.[0]?.uri;
      const eventId = response.data.id;

      if (!meetingUrl) {
        throw new Error('Failed to create Google Meet link');
      }

      return {
        meetingUrl,
        eventId,
      };
    } catch (error: any) {
      logger.error({ error }, 'Error creating Google Calendar event');
      throw new Error(`Failed to create meeting: ${error.message}`);
    }
  }

  async rescheduleMeeting(eventId: string, newStartTime: string, newDuration: number): Promise<void> {
    try {
      const startDate = new Date(newStartTime);
      const endDate = new Date(startDate.getTime() + newDuration * 60000);

      const event = await this.calendar.events.get({
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        eventId,
      });

      event.data.start = {
        dateTime: startDate.toISOString(),
        timeZone: 'UTC',
      };
      event.data.end = {
        dateTime: endDate.toISOString(),
        timeZone: 'UTC',
      };

      await this.calendar.events.update({
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        eventId,
        resource: event.data,
      });
    } catch (error: any) {
      logger.error({ error, eventId }, 'Error rescheduling Google Calendar event');
      throw new Error(`Failed to reschedule meeting: ${error.message}`);
    }
  }

  async deleteMeeting(eventId: string): Promise<void> {
    try {
      await this.calendar.events.delete({
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        eventId,
      });
    } catch (error: any) {
      logger.error({ error, eventId }, 'Error deleting Google Calendar event');
      throw new Error(`Failed to delete meeting: ${error.message}`);
    }
  }

  async getRecording(eventId: string): Promise<string | null> {
    try {
      // This is a simplified implementation
      // In production, you would need to:
      // 1. Query the Google Meet API for recordings
      // 2. Get the Drive file ID
      // 3. Return a link to the file

      // For now, return null (recording not available)
      logger.warn({ eventId }, 'Recording retrieval not fully implemented');
      return null;
    } catch (error: any) {
      logger.error({ error, eventId }, 'Error getting recording');
      return null;
    }
  }
}
