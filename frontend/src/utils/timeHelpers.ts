/**
 * Time formatting utility functions
 */

/**
 * Format hours as dual format: decimal and human-readable
 * Example: 4.5hrs (4 hrs 30 mins)
 * @param hours - The number of hours as decimal
 * @returns Formatted string with both formats
 */
export function formatHoursDual(hours: number): string {
  if (hours === null || hours === undefined || isNaN(hours)) {
    return '0hrs (0 mins)';
  }

  // Handle negative hours (though backend should prevent this)
  const isNegative = hours < 0;
  const absHours = Math.abs(hours);

  // Calculate hours and minutes
  const wholeHours = Math.floor(absHours);
  const minutes = Math.round((absHours - wholeHours) * 60);

  // Decimal format
  const decimalFormat = `${hours.toFixed(1)}hrs`;

  // Human-readable format
  let humanReadable = '';
  if (wholeHours > 0 && minutes > 0) {
    humanReadable = `${wholeHours} hrs ${minutes} mins`;
  } else if (wholeHours > 0) {
    humanReadable = `${wholeHours} hrs`;
  } else if (minutes > 0) {
    humanReadable = `${minutes} mins`;
  } else {
    humanReadable = '0 mins';
  }

  // Add negative sign if needed
  if (isNegative) {
    return `-${absHours.toFixed(1)}hrs (-${humanReadable})`;
  }

  return `${decimalFormat} (${humanReadable})`;
}

/**
 * Format hours as compact dual format for tables
 * Example: 4.5hrs (4 hrs 30 mins)
 * @param hours - The number of hours as decimal
 * @returns Compact formatted string
 */
export function formatHoursDualCompact(hours: number): string {
  if (hours === null || hours === undefined || isNaN(hours)) {
    return '0hrs (0 mins)';
  }

  const isNegative = hours < 0;
  const absHours = Math.abs(hours);

  const wholeHours = Math.floor(absHours);
  const minutes = Math.round((absHours - wholeHours) * 60);

  let humanReadable = '';
  if (wholeHours > 0 && minutes > 0) {
    humanReadable = `${wholeHours} hrs ${minutes} mins`;
  } else if (wholeHours > 0) {
    humanReadable = `${wholeHours} hrs`;
  } else if (minutes > 0) {
    humanReadable = `${minutes} mins`;
  } else {
    humanReadable = '0 mins';
  }

  if (isNegative) {
    return `-${absHours.toFixed(1)}hrs (-${humanReadable})`;
  }

  return `${hours.toFixed(1)}hrs (${humanReadable})`;
}

/**
 * Convert hours to human-readable format only
 * Example: 4h 30m
 * @param hours - The number of hours as decimal
 * @returns Human-readable time string
 */
export function hoursToHumanReadable(hours: number): string {
  if (hours === null || hours === undefined || isNaN(hours)) {
    return '0m';
  }

  const isNegative = hours < 0;
  const absHours = Math.abs(hours);

  const wholeHours = Math.floor(absHours);
  const minutes = Math.round((absHours - wholeHours) * 60);

  let result = '';
  if (wholeHours > 0 && minutes > 0) {
    result = `${wholeHours}h ${minutes}m`;
  } else if (wholeHours > 0) {
    result = `${wholeHours}h`;
  } else if (minutes > 0) {
    result = `${minutes}m`;
  } else {
    result = '0m';
  }

  return isNegative ? `-${result}` : result;
}

/**
 * Calculate duration in hours from start and end times
 * @param startTime - Start time as ISO string
 * @param endTime - End time as ISO string
 * @returns Duration in hours
 */
export function calculateHours(startTime: string, endTime: string): number {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();
  return diffMs / (1000 * 60 * 60);
}

/**
 * Format duration from start and end times with dual format
 * @param startTime - Start time as ISO string
 * @param endTime - End time as ISO string
 * @returns Formatted duration string
 */
export function formatDuration(startTime: string, endTime: string): string {
  const hours = calculateHours(startTime, endTime);
  return formatHoursDual(hours);
}

/**
 * Parse duration string (e.g., "4h 30m" or "4.5") to hours
 * @param durationStr - Duration string
 * @returns Hours as decimal number
 */
export function parseDurationToHours(durationStr: string): number | null {
  if (!durationStr) return null;

  // Try parsing as decimal first
  const decimalMatch = durationStr.match(/^(\d+\.?\d*)$/);
  if (decimalMatch) {
    return parseFloat(decimalMatch[1]);
  }

  // Parse "4h 30m" format
  const hourMinMatch = durationStr.match(/(?:(\d+)h)?\s*(?:(\d+)m)?/i);
  if (hourMinMatch) {
    const hours = hourMinMatch[1] ? parseInt(hourMinMatch[1]) : 0;
    const minutes = hourMinMatch[2] ? parseInt(hourMinMatch[2]) : 0;
    return hours + (minutes / 60);
  }

  return null;
}

/**
 * Validate time range (ensure end > start)
 * @param startTime - Start time as ISO string
 * @param endTime - End time as ISO string
 * @returns true if valid, false otherwise
 */
export function validateTimeRange(startTime: string, endTime: string): boolean {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return end > start;
}

/**
 * Check if duration is unusually long (> 12 hours)
 * @param hours - Hours to check
 * @returns true if unusually long
 */
export function isUnusuallyLong(hours: number): boolean {
  return hours > 12;
}

/**
 * Check if duration is unusually short (< 5 minutes)
 * @param hours - Hours to check
 * @returns true if unusually short
 */
export function isUnusuallyShort(hours: number): boolean {
  return hours < (5 / 60); // 5 minutes
}
