"use server";

import { getSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";

const createLeagueSchema = z.object({
  name: z.string().min(2).max(50),
  slug: z.string().min(3).max(40).regex(/^[a-z0-9-]+$/, "Slug invalide (a-z, 0-9, -)"),
  description: z.string().max(500).optional(),
  visibility: z.enum(["private", "public"]).default("private"),
  member_limit: z.number().int().min(2).max(500).default(50),
  allows_real_money: z.boolean().default(false),
});

export type CreateLeagueResult =
  | { ok: true; leagueId: string }
  | { ok: false; message: string };

export async function createLeague(
  input: z.infer<typeof createLeagueSchema>,
): Promise<CreateLeagueResult> {
  const parsed = createLeagueSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalide" };
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false, message: "Supabase non configuré" };
  }

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.rpc("create_league", {
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
    p_description: parsed.data.description,
    p_visibility: parsed.data.visibility,
    p_member_limit: parsed.data.member_limit,
    p_allows_real_money: parsed.data.allows_real_money,
  });

  if (error) return { ok: false, message: error.message };
  revalidatePath("/leagues");
  return { ok: true, leagueId: data };
}

export async function generateInvitation(
  leagueId: string,
  expiresDays = 14,
  maxUses = 1,
): Promise<{ ok: boolean; code?: string; message?: string }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false, message: "Supabase non configuré" };
  }

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.rpc("generate_invitation", {
    p_league_id: leagueId,
    p_expires_days: expiresDays,
    p_max_uses: maxUses,
  });

  if (error) return { ok: false, message: error.message };

  const row = data?.[0];
  if (!row) return { ok: false, message: "Aucune ligne retournée" };

  revalidatePath(`/leagues/${leagueId}/invite`);
  return { ok: true, code: row.code };
}
