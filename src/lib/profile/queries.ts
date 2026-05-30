import "server-only";
import { getSupabaseServer } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  locale: string;
  role: "player" | "admin" | "super_admin";
  balance_cents: number;
};

/**
 * Returns the currently-authenticated user with their public profile fields,
 * or null if unauthenticated. Single round-trip (joins auth + profiles).
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  const supabase = await getSupabaseServer();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  console.error(
    "[AUTHDBG] getCU getUser user=" +
      (user?.id ?? "null") +
      " err=" +
      (userErr?.message ?? "none"),
  );
  if (!user) return null;

  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url, locale, role, balance_cents")
    .eq("id", user.id)
    .maybeSingle();

  console.error(
    "[AUTHDBG] getCU profile=" +
      (profile ? profile.username : "null") +
      " err=" +
      (profErr?.message ?? "none"),
  );
  if (!profile) return null;

  return {
    id: user.id,
    email: user.email ?? "",
    username: profile.username,
    display_name: profile.display_name,
    avatar_url: profile.avatar_url,
    locale: profile.locale,
    role: profile.role,
    balance_cents: profile.balance_cents,
  };
}

export function isAdminRole(role: CurrentUser["role"]): boolean {
  return role === "admin" || role === "super_admin";
}
