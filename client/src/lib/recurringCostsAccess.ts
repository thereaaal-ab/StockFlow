import type { User } from "@supabase/supabase-js";

/**
 * Matches server `checkCanMutate` / `requireAdmin`: Supabase `app_metadata.role === "admin"`
 * or email listed in `VITE_ADMIN_EMAILS` (comma-separated, same intent as `ADMIN_EMAILS` on the server).
 */
export function canMutateRecurringCosts(user: User | null): boolean {
  if (!user) return false;
  if (user.app_metadata?.role === "admin") {
    return true;
  }
  const raw = import.meta.env.VITE_ADMIN_EMAILS?.trim();
  if (!raw) return false;
  const allowed = raw
    .split(",")
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean);
  const email = user.email?.toLowerCase();
  return !!(email && allowed.includes(email));
}
