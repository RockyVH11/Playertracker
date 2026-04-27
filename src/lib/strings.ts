/**
 * For duplicate identity checks: trim + lower case (application-level).
 * Stored `firstName` / `lastName` may retain user-entered casing in DB.
 */
export function normName(s: string): string {
  return s.trim().toLowerCase();
}
