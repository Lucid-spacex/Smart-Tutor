/**
 * Timezone conversion utilities for scheduling.
 *
 * Design principle: preferred session hours are stored as raw integers in the
 * parent's own local timezone (from User.timezone). We NEVER store a
 * pre-converted "Nigeria time" copy because:
 *   1. The parent's timezone may observe DST, so a stored conversion goes stale.
 *   2. Africa/Lagos does NOT observe DST, so the offset between a DST-observing
 *      parent timezone and Lagos changes twice per year.
 *
 * Instead, convert on demand at display/scheduling time using this utility.
 */

const LAGOS_TIMEZONE = 'Africa/Lagos';

/**
 * Given a preferred session hour in the parent's local timezone, returns the
 * equivalent hour in Africa/Lagos time \u2014 computed live so it's always correct
 * across DST transitions.
 *
 * @param rawHour        The hour (0\u201323) in the parent's local timezone
 * @param parentTimezone IANA timezone string, e.g. "America/New_York"
 * @param referenceDate  The date to use for DST offset calculation (defaults to now)
 * @returns              The equivalent hour (0\u201323) in Africa/Lagos time
 */
export function convertHourToLagos(
  rawHour: number,
  parentTimezone: string,
  referenceDate: Date = new Date(),
): number {
  // Build a reference datetime at the given hour in the parent's timezone.
  // We use a fixed date with the hour set \u2014 minutes/seconds don't matter for hour conversion.
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, '0');
  const day = String(referenceDate.getDate()).padStart(2, '0');

  // Format: "YYYY-MM-DDThh:00:00" — a wall-clock time in the parent's timezone
  const localDateStr = `${year}-${month}-${day}T${String(rawHour).padStart(2, '0')}:00:00`;

  // Parse the wall-clock time as a UTC equivalent using Intl
  const parentOffset = getUtcOffsetMinutes(localDateStr, parentTimezone);
  const lagosOffset = getUtcOffsetMinutes(localDateStr, LAGOS_TIMEZONE);

  // Convert: lagosHour = rawHour + (lagosOffset - parentOffset) / 60
  const diffMinutes = lagosOffset - parentOffset;
  const lagosHour = ((rawHour + Math.round(diffMinutes / 60)) % 24 + 24) % 24;

  return lagosHour;
}

/**
 * Returns the UTC offset (in minutes, positive = ahead of UTC) for a given
 * wall-clock time string in a given IANA timezone.
 *
 * Uses Intl.DateTimeFormat to determine the offset without any external library.
 */
function getUtcOffsetMinutes(localDateStr: string, timezone: string): number {
  // Strategy: format a known UTC date as the target timezone, compare to UTC
  // We use a slightly different approach: parse the local time as UTC, then
  // check what that UTC time looks like in the target timezone.
  const utcDate = new Date(localDateStr + 'Z'); // treat as UTC temporarily

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(utcDate);
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value ?? 0);

  const tzYear  = get('year');
  const tzMonth = get('month') - 1;
  const tzDay   = get('day');
  const tzHour  = get('hour') === 24 ? 0 : get('hour');
  const tzMin   = get('minute');

  // Reconstruct the timezone-local datetime as UTC to find the offset
  const tzAsUtc = Date.UTC(tzYear, tzMonth, tzDay, tzHour, tzMin, 0);
  const utcMs   = utcDate.getTime();

  // Offset = timezone_local - utc (in minutes)
  return Math.round((tzAsUtc - utcMs) / 60000);
}

/**
 * Returns both the Lagos-equivalent start and end hours for a session window,
 * given the parent's preferred hours in their own local timezone.
 *
 * Intended for use in admin/tutor scheduling responses so they can see the
 * Nigeria-time equivalent window without the app storing a pre-converted copy.
 *
 * @param preferredStartHour Parent's preferred start hour (0\u201323, local time)
 * @param preferredEndHour   Parent's preferred end hour (0\u201323, local time)
 * @param parentTimezone     Parent's IANA timezone (from User.timezone)
 * @param referenceDate      Date for DST reference (defaults to now)
 */
export function computeLagosEquivalentWindow(
  preferredStartHour: number,
  preferredEndHour: number,
  parentTimezone: string,
  referenceDate: Date = new Date(),
): { lagosStartHour: number; lagosEndHour: number; lagosTimezone: string } {
  // Fall back to UTC if no timezone is set on the parent's profile
  const tz = parentTimezone || 'UTC';

  return {
    lagosStartHour: convertHourToLagos(preferredStartHour, tz, referenceDate),
    lagosEndHour:   convertHourToLagos(preferredEndHour,   tz, referenceDate),
    lagosTimezone:  LAGOS_TIMEZONE,
  };
}
