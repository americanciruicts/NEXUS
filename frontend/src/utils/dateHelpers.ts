/**
 * Date helper functions to handle date conversions without timezone issues
 */

/**
 * Converts any date format to YYYY-MM-DD for date inputs
 * Handles:
 * - YYYY-MM-DD (returns as-is)
 * - MM/DD/YYYY (converts to YYYY-MM-DD)
 * - ISO timestamps (extracts date without timezone conversion)
 */
export const toDateInputFormat = (dateStr: unknown): string => {
  if (!dateStr) return '';
  const str = String(dateStr);

  // If already YYYY-MM-DD, return as is
  const ymdMatch = str.match(/^\d{4}-\d{2}-\d{2}/);
  if (ymdMatch) return ymdMatch[0];

  // If MM/DD/YYYY format, convert to YYYY-MM-DD
  const mdyMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (mdyMatch) {
    const [, month, day, year] = mdyMatch;
    return `${year}-${month}-${day}`;
  }

  // If ISO timestamp format (YYYY-MM-DDTHH:mm:ss), extract date part
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  return '';
};

/**
 * Formats any date to MM/DD/YYYY for display
 * Handles:
 * - MM/DD/YYYY (returns as-is)
 * - YYYY-MM-DD (converts to MM/DD/YYYY)
 * - ISO timestamps (extracts and converts date without timezone conversion)
 */
export const formatDateDisplay = (dateStr: unknown): string => {
  if (!dateStr) return '';
  const str = String(dateStr);

  // Check if already in MM/DD/YYYY format
  if (str.match(/^\d{2}\/\d{2}\/\d{4}/)) return str;

  // Parse YYYY-MM-DD format (including ISO timestamps)
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${month}/${day}/${year}`;
  }

  return str;
};
