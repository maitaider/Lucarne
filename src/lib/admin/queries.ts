import "server-only";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function isAdmin(): Promise<boolean> {
  // Fail closed: if Supabase isn't configured, deny admin access (never expose
  // the admin panel just because an env var went missing in production).
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return false;
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return data?.role === "admin" || data?.role === "super_admin";
}
