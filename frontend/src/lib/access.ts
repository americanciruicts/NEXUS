// Access gates that can't be cleanly expressed by the role enum alone.
// The maintenance form is only visible to admins plus a hand-picked list of
// users by username.

const MAINTENANCE_USERNAME_ALLOWLIST = new Set(['colleen', 'jackie', 'jayt']);

export type AccessUser = {
  username?: string;
  role?: string;
} | null | undefined;

export function canAccessMaintenance(user: AccessUser): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  const uname = (user.username || '').trim().toLowerCase();
  return MAINTENANCE_USERNAME_ALLOWLIST.has(uname);
}
