"use server";

import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const upsertSchema = z.object({
  id: z.string().uuid().nullable(),
  team_id: z.string().uuid(),
  full_name: z.string().trim().min(2).max(80),
  display_name: z.string().trim().min(1).max(40),
  shirt_number: z
    .union([z.number().int().min(1).max(99), z.null()])
    .optional(),
  position: z.enum(["GK", "DEF", "MID", "FWD"]).nullable().optional(),
  club: z.string().trim().max(80).nullable().optional(),
  active: z.boolean().default(true),
});

export type UpsertPlayerResult =
  | { ok: true; player_id: string }
  | { ok: false; message: string };

export async function upsertPlayer(
  input: z.infer<typeof upsertSchema>,
): Promise<UpsertPlayerResult> {
  const parsed = upsertSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Entrée invalide",
    };
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false, message: "Supabase non configuré" };
  }

  const supabase = await getSupabaseServer();
  // RPC signatures in the generated types expect non-nullable args, but our
  // SQL accepts NULL defaults — cast through `as never` so we can pass null.
  const { data, error } = await supabase.rpc("admin_upsert_player", {
    p_id: parsed.data.id,
    p_team_id: parsed.data.team_id,
    p_full_name: parsed.data.full_name,
    p_display_name: parsed.data.display_name,
    p_shirt_number: parsed.data.shirt_number ?? null,
    p_position: parsed.data.position ?? null,
    p_club: parsed.data.club ?? null,
    p_active: parsed.data.active,
  } as never);

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("forbidden"))
      return { ok: false, message: "Accès admin requis." };
    if (msg.includes("name_too_short"))
      return { ok: false, message: "Nom trop court (min 2)." };
    if (msg.includes("player_not_found"))
      return { ok: false, message: "Joueur introuvable." };
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/players");
  revalidatePath("/picks");
  return { ok: true, player_id: data as string };
}

export async function deletePlayer(
  id: string,
): Promise<{ ok: boolean; message?: string }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false, message: "Supabase non configuré" };
  }
  const supabase = await getSupabaseServer();
  const { error } = await supabase.rpc("admin_delete_player", { p_id: id });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/players");
  revalidatePath("/picks");
  return { ok: true };
}
