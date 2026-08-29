/**
 * Shared date utilities.
 * All dates in local calendar (YYYY-MM-DD), timestamps in UTC ISO strings.
 */

/**
 * Returns today's local date as YYYY-MM-DD in the given timezone.
 */
export function getTodayLocalDate(timeZone?: string): string {
  const tz = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now); // returns YYYY-MM-DD for en-CA locale
}

/**
 * Converts a UTC ISO timestamp to a local date string (YYYY-MM-DD).
 */
export function utcToLocalDate(isoTimestamp: string, timeZone?: string): string {
  const tz = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const date = new Date(isoTimestamp);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Returns current UTC ISO timestamp.
 */
export function nowUtc(): string {
  return new Date().toISOString();
}

/**
 * Parses a YYYY-MM-DD string into a Date object at midnight local time.
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Returns the start of today as a Date object (local midnight).
 */
export function startOfToday(timeZone?: string): Date {
  const today = getTodayLocalDate(timeZone);
  return parseLocalDate(today);
}

/**
 * Returns start of a local date at UTC midnight.
 */
export function localDateToUtcStartString(dateStr: string): string {
  return parseLocalDate(dateStr).toISOString();
}

/**
 * Adds days to a local date string.
 */
export function addDaysToLocalDate(dateStr: string, days: number): string {
  const date = parseLocalDate(dateStr);
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

/**
 * Formats a Date object as YYYY-MM-DD.
 */
export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Computes the number of days between two local date strings.
 */
export function daysBetween(from: string, to: string): number {
  const a = parseLocalDate(from);
  const b = parseLocalDate(to);
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Returns a human-friendly label for a date relative to today.
 */
export function relativeDateLabel(localDate: string, timeZone?: string): string {
  const today = getTodayLocalDate(timeZone);
  const diff = daysBetween(localDate, today);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff === -1) return 'Tomorrow';
  const date = parseLocalDate(localDate);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Returns a short time string from a UTC ISO timestamp.
 */
export function formatTime(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Returns a formatted date+time string.
 */
export function formatDateTime(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Creates a UTC timestamp for the given local date at a specific time.
 * Useful for setting eatenAt when only a local date is known.
 */
export function localDateAtHourToUtc(localDate: string, hour: number = 12): string {
  const date = parseLocalDate(localDate);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}
