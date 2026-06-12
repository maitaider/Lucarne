"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  archiveUser,
  purgeUser,
  restoreUser,
  setUserRole,
  setUserPredictionUnlock,
} from "@/lib/admin/actions";
import { useToast } from "@/components/ui/toast-provider";
import {
  Archive,
  ArchiveRestore,
  KeyRound,
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
        toast.success(fr ? "Joueur supprimé." : "Player deleted.");
        close();
        router.refresh();
      } else {
        toast.error(res.message ?? "Erreur");
      }
    });
  }

  function handleUnlock(hours: number) {
    startTransition(async () => {
      const res = await setUserPredictionUnlock(userId, hours);
      if (res.ok) {
        toast.success(
          hours > 0
            ? fr
              ? "Pronos débloqués (1 h)."
              : "Predictions unlocked (1 h)."
            : fr
              ? "Reverrouillé."
              : "Re-locked.",
        );
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
        <div
          className="fixed inset-0 z-[150] overflow-y-auto overscroll-contain"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="fixed inset-0 bg-abyss/80 backdrop-blur-sm"
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md rounded-[14px] border border-white/[0.1] bg-abyss/95 shadow-2xl backdrop-blur-2xl">
              <header className="border-b border-white/[0.08] px-5 py-4">
                <h3 className="font-display text-lg font-semibold text-text-primary">
                  {fr ? "Gérer" : "Manage"} @{username}
                </h3>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  {fr
                    ? "Rôle et accès au tournoi. Toutes les actions sont tracées."
                    : "Role and tournament access. Every action is audited."}
                </p>
              </header>

              <div className="space-y-5 p-5">
                {/* Role (super admin only) */}
                {isSuperAdmin && (
                  <section>
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
                        <option value="player">{fr ? "Joueur" : "Player"}</option>
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

                {/* Unlock predictions (late entry / per-user grace) */}
                {!isSelf && (
                  <section
                    className={cn(
                      isSuperAdmin && "border-t border-white/[0.08] pt-4",
                    )}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <KeyRound className="size-4 text-primary-400" strokeWidth={1.7} />
                      <h4 className="text-sm font-bold text-text-primary">
                        {fr ? "Débloquer les pronos" : "Unlock predictions"}
                      </h4>
                    </div>
                    <p className="mb-2.5 text-xs leading-5 text-text-secondary">
                      {fr
                        ? "Redonne à ce joueur 1 h pour pronostiquer les matchs à venir (les matchs déjà joués comptent 0 pt)."
                        : "Give this player 1 h to predict upcoming matches (already-played matches score 0)."}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleUnlock(1)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 rounded-sm bg-primary-500 px-3 py-2 text-xs font-bold text-abyss transition hover:bg-primary-400 disabled:opacity-60"
                      >
                        {isPending ? (
                          <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />
                        ) : (
                          <KeyRound className="size-3.5" strokeWidth={2.4} />
                        )}
                        {fr ? "Débloquer 1 h" : "Unlock 1 h"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUnlock(0)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1 rounded-sm border border-white/[0.12] px-3 py-2 text-xs font-semibold text-text-secondary transition hover:text-text-primary disabled:opacity-60"
                      >
                        {fr ? "Reverrouiller" : "Re-lock"}
                      </button>
                    </div>
                  </section>
                )}

                {/* Remove player — archive / restore / delete */}
                {isSelf ? (
                  <p className="rounded-sm border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-xs text-text-tertiary">
                    {fr
                      ? "C'est ton propre compte — tu ne peux pas t'archiver ni te supprimer."
                      : "This is your own account — you can't archive or delete yourself."}
                  </p>
                ) : (
                  <section
                    className={cn(
                      isSuperAdmin && "border-t border-white/[0.08] pt-4",
                    )}
                  >
                    <h4 className="mb-3 text-sm font-bold text-text-primary">
                      {fr ? "Retirer ce joueur" : "Remove this player"}
                    </h4>

                    {isArchived ? (
                      <div className="rounded-[10px] border border-white/[0.1] bg-white/[0.03] p-4">
                        <p className="mb-3 text-xs text-text-secondary">
                          {fr
                            ? "Ce compte est archivé : connexion bloquée et masqué des classements."
                            : "This account is archived: login disabled and hidden from standings."}
                        </p>
                        <button
                          type="button"
                          onClick={handleRestore}
                          disabled={isPending}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-sm bg-primary-500/15 px-4 py-2.5 text-sm font-bold text-primary-200 ring-1 ring-primary-500/30 transition hover:bg-primary-500/25 disabled:opacity-60"
                        >
                          {isPending ? (
                            <Loader2 className="size-4 animate-spin" strokeWidth={2} />
                          ) : (
                            <ArchiveRestore className="size-4" strokeWidth={1.9} />
                          )}
                          {fr ? "Restaurer le compte" : "Restore account"}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Archive — the safe, reversible removal */}
                        <div className="rounded-[10px] border border-gold-500/25 bg-gold-500/[0.05] p-4">
                          <div className="mb-1 flex items-center gap-2">
                            <Archive className="size-4 text-gold-300" strokeWidth={1.8} />
                            <span className="text-sm font-bold text-text-primary">
                              {fr ? "Archiver" : "Archive"}
                            </span>
                            <span className="ml-auto rounded-full bg-gold-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold-300">
                              {fr ? "Réversible" : "Reversible"}
                            </span>
                          </div>
                          <p className="mb-2.5 text-xs leading-5 text-text-secondary">
                            {fr
                              ? "Désactive le compte : connexion bloquée, retiré des classements. Réactivable à tout moment. À privilégier."
                              : "Disables the account: login blocked, removed from standings. Re-enable anytime. Preferred option."}
                          </p>
                          <input
                            type="text"
                            value={archiveReason}
                            onChange={(e) => setArchiveReason(e.target.value)}
                            maxLength={200}
                            placeholder={fr ? "Raison (optionnel)" : "Reason (optional)"}
                            className="mb-2 w-full rounded-sm border border-white/[0.1] bg-abyss/[0.6] px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-gold-500/50"
                          />
                          <button
                            type="button"
                            onClick={handleArchive}
                            disabled={isPending}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-sm bg-gold-500 px-4 py-2.5 text-sm font-bold text-abyss transition hover:bg-gold-400 disabled:opacity-60"
                          >
                            {isPending ? (
                              <Loader2 className="size-4 animate-spin" strokeWidth={2} />
                            ) : (
                              <Archive className="size-4" strokeWidth={1.9} />
                            )}
                            {fr ? "Archiver le joueur" : "Archive player"}
                          </button>
                        </div>

                        {/* Delete — permanent */}
                        <div className="rounded-[10px] border border-error/25 bg-error/[0.05] p-4">
                          <div className="mb-1 flex items-center gap-2">
                            <Trash2 className="size-4 text-error" strokeWidth={1.8} />
                            <span className="text-sm font-bold text-text-primary">
                              {fr ? "Supprimer définitivement" : "Delete permanently"}
                            </span>
                          </div>
                          <p className="mb-2.5 text-xs leading-5 text-text-secondary">
                            {fr
                              ? "Efface le compte et toutes ses données — y compris ses paiements (pronostics, ligues, messages). Irréversible."
                              : "Erases the account and all its data — including its payments (picks, leagues, messages). Irreversible."}
                          </p>

                          {!canPurge ? (
                            <>
                              <button
                                type="button"
                                disabled
                                className="inline-flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-sm bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-text-tertiary"
                              >
                                <Trash2 className="size-4" strokeWidth={1.9} />
                                {fr ? "Indisponible" : "Unavailable"}
                              </button>
                              <p className="mt-2 text-[11px] leading-4 text-text-tertiary">
                                {fr
                                  ? "Ce joueur possède une ligue (elle deviendrait orpheline). Transfère-la ou archive-le."
                                  : "This player owns a league (it would be orphaned). Transfer it or archive them."}
                              </p>
                            </>
                          ) : confirmingPurge ? (
                            <div className="space-y-2 rounded-sm border border-error/30 bg-error/[0.08] p-3">
                              <p className="text-xs font-semibold text-error">
                                {fr
                                  ? "Confirmer la suppression définitive ? Cette action est irréversible."
                                  : "Confirm permanent deletion? This cannot be undone."}
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
                              className="inline-flex w-full items-center justify-center gap-1.5 rounded-sm bg-error/15 px-4 py-2.5 text-sm font-bold text-error ring-1 ring-error/30 transition hover:bg-error/25"
                            >
                              <Trash2 className="size-4" strokeWidth={1.9} />
                              {fr ? "Supprimer définitivement" : "Delete permanently"}
                            </button>
                          )}
                        </div>
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
