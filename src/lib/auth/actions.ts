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

/**
 * Server-side sign-in. The server client writes the session cookies onto the
 * response itself (no browser cookie handoff that can fail in production), then
 * redirects to /dashboard. Returns { error } on failure so the form can show it.
 */
export async function signInWithPasswordAction(
  email: string,
  password: string,
): Promise<{ error: string } | void> {
  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  const locale = await getLocale();
  redirect({ href: "/dashboard", locale });
}

/**
 * Server-side sign-up with an invitation code. signUp establishes the session
 * server-side (project auto-confirms), then the code is redeemed as the new
 * user (joining the house league). Returns { error } on failure.
 */
export async function signUpWithInviteAction(input: {
  email: string;
  password: string;
  username: string;
  code: string;
}): Promise<{ error: string } | void> {
  const supabase = await getSupabaseServer();
  const { error: signUpError } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { username: input.username, invitation_code: input.code } },
  });
  if (signUpError) return { error: signUpError.message };

  const { error: rpcError } = await supabase.rpc("redeem_invitation", {
    p_code: input.code,
  });
  if (rpcError) {
    return {
      error: `Compte créé, mais le code est invalide ou expiré : ${rpcError.message}`,
    };
  }

  const locale = await getLocale();
  redirect({ href: "/dashboard", locale });
}
