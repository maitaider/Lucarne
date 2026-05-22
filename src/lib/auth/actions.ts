"use server";

import { getSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export async function signOut(): Promise<void> {
  const supabase = await getSupabaseServer();
  await supabase.auth.signOut();
  const locale = await getLocale();
  redirect({ href: "/login", locale });
}
