"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import type { PlayerRow } from "@/lib/players/queries";
import { deletePlayer, upsertPlayer } from "@/lib/players/actions";
import { useToast } from "@/components/ui/toast-provider";
import { Flag } from "@/components/team/flag";
import { Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

type TeamLite = {
  id: string;
  fifa_code: string;
  iso_code: string | null;
  name_fr: string;
  name_en: string;
};

type DraftPlayer = {
  id: string | null;
  full_name: string;
  display_name: string;
  position: "GK" | "DEF" | "MID" | "FWD" | "";
  shirt_number: string;
  club: string;
};

function emptyDraft(): DraftPlayer {
  return {
    id: null,
    full_name: "",
    display_name: "",
    position: "",
    shirt_number: "",
    club: "",
  };
}

export function PlayersAdminPanel({
  teams,
  selectedTeamId,
  roster,
  locale,
}: {
  teams: TeamLite[];
  selectedTeamId: string | null;
  roster: PlayerRow[];
  locale: Locale;
}) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<DraftPlayer | null>(null);
  const [isPending, startTransition] = useTransition();

  function selectTeam(id: string) {
    setEditing(null);
    router.replace(`/admin/players?team=${id}`);
  }

  function startAdd() {
    setEditing(emptyDraft());
  }
  function startEdit(p: PlayerRow) {
    setEditing({
      id: p.id,
      full_name: p.full_name,
      display_name: p.display_name,
      position: (p.position ?? "") as DraftPlayer["position"],
      shirt_number: p.shirt_number != null ? String(p.shirt_number) : "",
      club: p.club ?? "",
    });
  }
  function cancelEdit() {
    setEditing(null);
  }

  function save() {
    if (!editing || !selectedTeamId) return;
    const trimmedFull = editing.full_name.trim();
    if (trimmedFull.length < 2) {
      toast.error(
        locale === "fr"
          ? "Nom complet requis (min 2 caractères)"
          : "Full name required (min 2 chars)",
      );
      return;
    }
    const display = editing.display_name.trim() || lastWord(trimmedFull);
    const shirt = editing.shirt_number.trim()
      ? Number(editing.shirt_number.trim())
      : null;
    if (shirt != null && (shirt < 1 || shirt > 99 || !Number.isInteger(shirt))) {
      toast.error(
        locale === "fr"
          ? "Numéro de maillot 1-99"
          : "Shirt number must be 1-99",
      );
      return;
    }

    startTransition(async () => {
      const res = await upsertPlayer({
        id: editing.id,
        team_id: selectedTeamId,
        full_name: trimmedFull,
        display_name: display,
        shirt_number: shirt,
        position: editing.position === "" ? null : editing.position,
        club: editing.club.trim() || null,
        active: true,
      });
      if (res.ok) {
        toast.success(
          editing.id
            ? locale === "fr"
              ? "Joueur mis à jour"
              : "Player updated"
            : locale === "fr"
              ? "Joueur ajouté"
              : "Player added",
        );
        setEditing(null);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

  function remove(p: PlayerRow) {
    if (
      !confirm(
        locale === "fr"
          ? `Supprimer ${p.display_name} ?`
          : `Delete ${p.display_name}?`,
      )
    )
      return;
    startTransition(async () => {
      const res = await deletePlayer(p.id);
      if (res.ok) {
        toast.success(
          locale === "fr" ? "Joueur supprimé" : "Player deleted",
        );
        router.refresh();
      } else {
        toast.error(res.message ?? "Erreur");
      }
    });
  }

  const selectedTeam = teams.find((t) => t.id === selectedTeamId) ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      {/* Team list */}
      <aside className="rounded-md border border-white/[0.08] bg-surface-1/[0.6] backdrop-blur-xl">
        <ul className="max-h-[60vh] overflow-y-auto divide-y divide-white/[0.05]">
          {teams.map((t) => {
            const active = t.id === selectedTeamId;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => selectTeam(t.id)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition",
                    active
                      ? "bg-violet-500/[0.12] text-text-primary"
                      : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary",
                  )}
                >
                  <Flag isoCode={t.iso_code} size="sm" />
                  <span className="truncate">
                    {locale === "fr" ? t.name_fr : t.name_en}
                  </span>
                  <span className="ml-auto font-mono text-[9px] text-text-tertiary">
                    {t.fifa_code}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Roster panel */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {selectedTeam && (
              <Flag isoCode={selectedTeam.iso_code} size="lg" />
            )}
            <h2 className="font-display text-xl font-semibold text-text-primary">
              {selectedTeam
                ? locale === "fr"
                  ? selectedTeam.name_fr
                  : selectedTeam.name_en
                : locale === "fr"
                  ? "Choisis une équipe"
                  : "Pick a team"}
            </h2>
          </div>
          {selectedTeam && !editing && (
            <button
              type="button"
              onClick={startAdd}
              className="inline-flex items-center gap-1.5 rounded-sm bg-violet-500 px-3 py-1.5 text-xs font-bold text-abyss shadow-glow-violet transition hover:bg-violet-400"
            >
              <Plus className="size-3.5" strokeWidth={2.5} />
              {locale === "fr" ? "Ajouter" : "Add"}
            </button>
          )}
        </div>

        {editing && selectedTeam && (
          <DraftForm
            draft={editing}
            disabled={isPending}
            onChange={setEditing}
            onSave={save}
            onCancel={cancelEdit}
            locale={locale}
          />
        )}

        {!selectedTeam ? (
          <div className="rounded-[10px] border border-dashed border-white/[0.1] bg-surface-1/[0.4] p-6 text-center text-sm text-text-secondary">
            {locale === "fr"
              ? "Sélectionne une équipe à gauche."
              : "Pick a team on the left."}
          </div>
        ) : roster.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-white/[0.1] bg-surface-1/[0.4] p-6 text-center text-sm text-text-secondary">
            {locale === "fr"
              ? "Aucun joueur enregistré pour cette équipe."
              : "No players for this team yet."}
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-[10px] border border-white/[0.08] bg-surface-1/[0.55] backdrop-blur-xl">
            {roster.map((p) => (
              <li
                key={p.id}
                className="grid grid-cols-[3rem_minmax(0,1fr)_4rem_8rem_auto] items-center gap-3 px-3 py-2 text-sm"
              >
                <span className="text-center font-mono text-xs tabular-nums text-text-tertiary">
                  {p.shirt_number ?? "—"}
                </span>
                <div className="min-w-0">
                  <div className="truncate font-semibold text-text-primary">
                    {p.display_name}
                  </div>
                  <div className="truncate text-[11px] text-text-tertiary">
                    {p.full_name}
                  </div>
                </div>
                <span className="text-center text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                  {p.position ?? "—"}
                </span>
                <span className="truncate text-xs text-text-secondary">
                  {p.club ?? ""}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(p)}
                    aria-label="Edit"
                    className="rounded-md p-1.5 text-text-tertiary hover:bg-white/[0.06] hover:text-text-primary"
                  >
                    <Pencil className="size-3.5" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(p)}
                    aria-label="Delete"
                    className="rounded-md p-1.5 text-text-tertiary hover:bg-error/15 hover:text-error"
                  >
                    <Trash2 className="size-3.5" strokeWidth={2} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function DraftForm({
  draft,
  disabled,
  onChange,
  onSave,
  onCancel,
  locale,
}: {
  draft: DraftPlayer;
  disabled: boolean;
  onChange: (d: DraftPlayer) => void;
  onSave: () => void;
  onCancel: () => void;
  locale: Locale;
}) {
  function field<K extends keyof DraftPlayer>(k: K, v: DraftPlayer[K]) {
    onChange({ ...draft, [k]: v });
  }
  return (
    <div className="grid gap-2 rounded-[10px] border border-violet-500/30 bg-violet-500/[0.06] p-3 sm:grid-cols-[2fr_2fr_3.5rem_5rem_2.5fr_auto]">
      <input
        type="text"
        value={draft.full_name}
        onChange={(e) => field("full_name", e.target.value)}
        placeholder={
          locale === "fr" ? "Nom complet" : "Full name"
        }
        className="rounded-xs border border-white/[0.08] bg-abyss/[0.5] px-2 py-1.5 text-xs text-text-primary outline-none placeholder:text-text-tertiary focus:border-violet-500/40"
      />
      <input
        type="text"
        value={draft.display_name}
        onChange={(e) => field("display_name", e.target.value)}
        placeholder={locale === "fr" ? "Nom court" : "Display"}
        className="rounded-xs border border-white/[0.08] bg-abyss/[0.5] px-2 py-1.5 text-xs text-text-primary outline-none placeholder:text-text-tertiary focus:border-violet-500/40"
      />
      <input
        type="number"
        min={1}
        max={99}
        value={draft.shirt_number}
        onChange={(e) => field("shirt_number", e.target.value)}
        placeholder="#"
        className="rounded-xs border border-white/[0.08] bg-abyss/[0.5] px-2 py-1.5 text-center text-xs text-text-primary outline-none placeholder:text-text-tertiary focus:border-violet-500/40"
      />
      <select
        value={draft.position}
        onChange={(e) =>
          field("position", e.target.value as DraftPlayer["position"])
        }
        className="rounded-xs border border-white/[0.08] bg-abyss/[0.5] px-2 py-1.5 text-xs text-text-primary outline-none focus:border-violet-500/40"
      >
        <option value="">—</option>
        <option value="GK">GK</option>
        <option value="DEF">DEF</option>
        <option value="MID">MID</option>
        <option value="FWD">FWD</option>
      </select>
      <input
        type="text"
        value={draft.club}
        onChange={(e) => field("club", e.target.value)}
        placeholder={locale === "fr" ? "Club" : "Club"}
        className="rounded-xs border border-white/[0.08] bg-abyss/[0.5] px-2 py-1.5 text-xs text-text-primary outline-none placeholder:text-text-tertiary focus:border-violet-500/40"
      />
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={disabled}
          onClick={onSave}
          aria-label="Save"
          className="inline-flex items-center gap-1 rounded-xs bg-violet-500 px-2 py-1.5 text-xs font-bold text-abyss transition hover:bg-violet-400 disabled:opacity-50"
        >
          {disabled ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Save className="size-3" strokeWidth={2.5} />
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="rounded-xs border border-white/[0.08] bg-white/[0.04] p-1.5 text-text-secondary hover:text-text-primary"
        >
          <X className="size-3" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

function lastWord(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] ?? name;
}
