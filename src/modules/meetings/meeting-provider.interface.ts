export interface MeetingProvider {
  /**
   * Create a meeting
   * @param startTime Start time in ISO format
   * @param duration Duration in minutes
   * @param title Meeting title
   * @param description Meeting description
   * @returns Meeting URL and event ID
   */
  createMeeting(startTime: string, duration: number, title: string, description?: string): Promise<{
    meetingUrl: string;
    eventId: string;
  }>;

  /**
   * Reschedule a meeting
   * @param eventId Event ID from the provider
   * @param newStartTime New start time in ISO format
   * @param newDuration New duration in minutes
   */
  rescheduleMeeting(eventId: string, newStartTime: string, newDuration: number): Promise<void>;

  /**
   * Delete a meeting
   * @param eventId Event ID from the provider
   */
  deleteMeeting(eventId: string): Promise<void>;

  /**
   * Get recording URL for a meeting
   * @param eventId Event ID from the provider
   * @returns Recording URL or null if not available
   */
  getRecording(eventId: string): Promise<string | null>;
}
