"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  adjustBalance,
  archiveUser,
  purgeUser,
  restoreUser,
  setUserRole,
} from "@/lib/admin/actions";
import { useToast } from "@/components/ui/toast-provider";
import {
  AlertTriangle,
  ArchiveRestore,
  Coins,
  Loader2,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

export function ManageUserButton({
  userId,
  username,
  currentRole,
  isSuperAdmin,
  isArchived,
  canPurge,
  isSelf,
  locale,
}: {
  userId: string;
  username: string;
  currentRole: "player" | "admin" | "super_admin";
  isSuperAdmin: boolean;
  isArchived: boolean;
  canPurge: boolean;
  isSelf: boolean;
  locale: Locale;
}) {
  const fr = locale === "fr";
  const [open, setOpen] = useState(false);
  const [delta, setDelta] = useState("0");
  const [reason, setReason] = useState("");
  const [archiveReason, setArchiveReason] = useState("");
  const [confirmingPurge, setConfirmingPurge] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [newRole, setNewRole] = useState<"player" | "admin" | "super_admin">(
    currentRole,
  );
  const router = useRouter();
  const toast = useToast();

  function close() {
    setOpen(false);
    setConfirmingPurge(false);
  }

  function handleAdjust() {
    const d = Number(delta);
    if (!Number.isFinite(d) || d === 0) {
      toast.error(fr ? "Saisis un montant non nul." : "Enter a non-zero amount.");
      return;
    }
    if (reason.trim().length < 3) {
      toast.error(fr ? "Raison trop courte." : "Reason too short.");
      return;
    }
    startTransition(async () => {
      const res = await adjustBalance({
        user_id: userId,
        delta_tokens: Math.round(d),
        reason: reason.trim(),
      });
      if (res.ok) {
        toast.success(fr ? "Solde mis à jour." : "Balance updated.");
        close();
        setDelta("0");
        setReason("");
        router.refresh();
      } else {
        toast.error(res.message ?? "Erreur");
      }
    });
  }

  function handleRoleChange() {
    if (newRole === currentRole) return;
    startTransition(async () => {
      const res = await setUserRole({ user_id: userId, new_role: newRole });
      if (res.ok) {
        toast.success(fr ? "Rôle mis à jour." : "Role updated.");
        close();
        router.refresh();
      } else {
        toast.error(res.message ?? "Erreur");
      }
    });
  }

  function handleArchive() {
    startTransition(async () => {
      const res = await archiveUser({
        user_id: userId,
        reason: archiveReason.trim() || undefined,
      });
      if (res.ok) {
        toast.success(fr ? "Joueur archivé." : "Player archived.");
        close();
        setArchiveReason("");
        router.refresh();
      } else {
        toast.error(res.message ?? "Erreur");
      }
    });
  }

  function handleRestore() {
    startTransition(async () => {
      const res = await restoreUser({ user_id: userId });
      if (res.ok) {
        toast.success(fr ? "Joueur restauré." : "Player restored.");
        close();
        router.refresh();
      } else {
        toast.error(res.message ?? "Erreur");
      }
    });
  }

  function handlePurge() {
    startTransition(async () => {
      const res = await purgeUser({ user_id: userId });
      if (res.ok) {
        toast.success(fr ? "Joueur supprimé définitivement." : "Player deleted.");
        close();
        router.refresh();
      } else {
        toast.error(res.message ?? "Erreur");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-text-secondary transition hover:bg-white/[0.06] hover:text-text-primary"
      >
        {fr ? "Gérer" : "Manage"}
      </button>

      {open && (
        <div className="fixed inset-0 z-[150]" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="absolute inset-0 bg-abyss/80 backdrop-blur-sm"
          />
          <div className="absolute left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-4">
            <div className="max-h-[88dvh] overflow-y-auto rounded-[14px] border border-white/[0.1] bg-abyss/95 shadow-2xl backdrop-blur-2xl">
              <header className="border-b border-white/[0.08] px-5 py-4">
                <h3 className="font-display text-lg font-semibold text-text-primary">
                  {fr ? "Gérer" : "Manage"} @{username}
                </h3>
              </header>

              <div className="space-y-5 p-5">
                {/* Adjust balance */}
                <section>
                  <div className="mb-2 flex items-center gap-2">
                    <Coins className="size-4 text-primary-400" strokeWidth={1.7} />
                    <h4 className="text-sm font-bold text-text-primary">
                      {fr ? "Ajuster le solde" : "Adjust balance"}
                    </h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step={1}
                        value={delta}
                        onChange={(e) => setDelta(e.target.value)}
                        placeholder="ex: +100 ou -50"
                        className="flex-1 rounded-sm border border-white/[0.1] bg-abyss/[0.6] px-3 py-2 text-sm tabular-nums text-text-primary outline-none focus:border-primary-500/50"
                      />
                      <span className="text-xs text-text-tertiary">
                        {fr ? "jetons" : "tokens"}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      maxLength={200}
                      placeholder={
                        fr
                          ? "Raison (ex: bonus participation)"
                          : "Reason (e.g. participation bonus)"
                      }
                      className="w-full rounded-sm border border-white/[0.1] bg-abyss/[0.6] px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-primary-500/50"
                    />
                    <button
                      type="button"
                      onClick={handleAdjust}
                      disabled={isPending}
                      className={cn(
                        "inline-flex w-full items-center justify-center gap-1.5 rounded-sm px-4 py-2 text-sm font-bold transition",
                        isPending
                          ? "bg-white/[0.06] text-text-tertiary"
                          : "bg-primary-500 text-abyss shadow-glow-primary hover:bg-primary-400",
                      )}
                    >
                      {isPending && (
                        <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />
                      )}
                      {fr ? "Appliquer" : "Apply"}
                    </button>
                  </div>
                </section>

                {/* Role */}
                {isSuperAdmin && (
                  <section className="border-t border-white/[0.08] pt-4">
                    <div className="mb-2 flex items-center gap-2">
                      <ShieldCheck className="size-4 text-gold-400" strokeWidth={1.7} />
                      <h4 className="text-sm font-bold text-text-primary">
                        {fr ? "Rôle" : "Role"}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={newRole}
                        onChange={(e) =>
                          setNewRole(
                            e.target.value as "player" | "admin" | "super_admin",
                          )
                        }
                        className="flex-1 rounded-sm border border-white/[0.1] bg-abyss/[0.6] px-3 py-2 text-sm text-text-primary outline-none focus:border-primary-500/50"
                      >
                        <option value="player">Player</option>
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super admin</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleRoleChange}
                        disabled={isPending || newRole === currentRole}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-sm px-3 py-2 text-xs font-bold transition",
                          newRole === currentRole
                            ? "bg-white/[0.06] text-text-tertiary"
                            : "bg-gold-500 text-abyss hover:bg-gold-400",
                        )}
                      >
                        {fr ? "Changer" : "Set"}
                      </button>
                    </div>
                  </section>
                )}

                {/* Danger zone — archive / restore / purge (never on self) */}
                {!isSelf && (
                  <section className="border-t border-error/15 pt-4">
                    <div className="mb-2 flex items-center gap-2">
                      <AlertTriangle className="size-4 text-error" strokeWidth={1.7} />
                      <h4 className="text-sm font-bold text-text-primary">
                        {fr ? "Zone de danger" : "Danger zone"}
                      </h4>
                    </div>

                    {isArchived ? (
                      <div className="space-y-2">
                        <p className="text-xs text-text-tertiary">
                          {fr
                            ? "Compte archivé : connexion bloquée, masqué des classements."
                            : "Account archived: login disabled, hidden from standings."}
                        </p>
                        <button
                          type="button"
                          onClick={handleRestore}
                          disabled={isPending}
                          className={cn(
                            "inline-flex w-full items-center justify-center gap-1.5 rounded-sm px-4 py-2 text-sm font-bold transition",
                            isPending
                              ? "bg-white/[0.06] text-text-tertiary"
                              : "bg-primary-500/15 text-primary-200 ring-1 ring-primary-500/30 hover:bg-primary-500/25",
                          )}
                        >
                          {isPending ? (
                            <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />
                          ) : (
                            <ArchiveRestore className="size-3.5" strokeWidth={2} />
                          )}
                          {fr ? "Restaurer le compte" : "Restore account"}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Archive */}
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={archiveReason}
                            onChange={(e) => setArchiveReason(e.target.value)}
                            maxLength={200}
                            placeholder={
                              fr ? "Raison (optionnel)" : "Reason (optional)"
                            }
                            className="w-full rounded-sm border border-white/[0.1] bg-abyss/[0.6] px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-error/50"
                          />
                          <button
                            type="button"
                            onClick={handleArchive}
                            disabled={isPending}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-sm bg-gold-500/15 px-4 py-2 text-sm font-bold text-gold-200 ring-1 ring-gold-500/30 transition hover:bg-gold-500/25 disabled:opacity-60"
                          >
                            {fr ? "Archiver (réversible)" : "Archive (reversible)"}
                          </button>
                          <p className="text-[11px] leading-4 text-text-tertiary">
                            {fr
                              ? "Bloque la connexion et retire des classements. Réversible à tout moment."
                              : "Disables login and removes from standings. Reversible anytime."}
                          </p>
                        </div>

                        {/* Hard purge */}
                        {canPurge ? (
                          confirmingPurge ? (
                            <div className="space-y-2 rounded-sm border border-error/30 bg-error/[0.08] p-3">
                              <p className="text-xs font-semibold text-error">
                                {fr
                                  ? "Supprimer définitivement ce compte et toutes ses données ? Irréversible."
                                  : "Permanently delete this account and all its data? Irreversible."}
                              </p>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={handlePurge}
                                  disabled={isPending}
                                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-sm bg-error px-3 py-2 text-xs font-bold text-white transition hover:bg-error/85 disabled:opacity-60"
                                >
                                  {isPending ? (
                                    <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />
                                  ) : (
                                    <Trash2 className="size-3.5" strokeWidth={2} />
                                  )}
                                  {fr ? "Oui, supprimer" : "Yes, delete"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmingPurge(false)}
                                  disabled={isPending}
                                  className="rounded-sm px-3 py-2 text-xs text-text-tertiary hover:text-text-primary"
                                >
                                  {fr ? "Annuler" : "Cancel"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmingPurge(true)}
                              className="inline-flex w-full items-center justify-center gap-1.5 rounded-sm px-4 py-2 text-sm font-bold text-error transition hover:bg-error/10"
                            >
                              <Trash2 className="size-3.5" strokeWidth={2} />
                              {fr ? "Supprimer définitivement" : "Delete permanently"}
                            </button>
                          )
                        ) : (
                          <p className="text-[11px] leading-4 text-text-tertiary">
                            {fr
                              ? "Suppression définitive indisponible (paiements ou ligue liés). Archive plutôt."
                              : "Permanent delete unavailable (linked payments or league). Archive instead."}
                          </p>
                        )}
                      </div>
                    )}
                  </section>
                )}

                <button
                  type="button"
                  onClick={close}
                  className="w-full rounded-md px-3 py-1.5 text-xs text-text-tertiary hover:text-text-primary"
                >
                  {fr ? "Fermer" : "Close"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
