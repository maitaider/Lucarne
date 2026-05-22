"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { adjustBalance, setUserRole } from "@/lib/admin/actions";
import { useToast } from "@/components/ui/toast-provider";
import { Coins, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

export function AdjustBalanceButton({
  userId,
  username,
  currentRole,
  isSuperAdmin,
  locale,
}: {
  userId: string;
  username: string;
  currentRole: "player" | "admin" | "super_admin";
  isSuperAdmin: boolean;
  locale: Locale;
}) {
  const [open, setOpen] = useState(false);
  const [delta, setDelta] = useState("0");
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [newRole, setNewRole] = useState<"player" | "admin" | "super_admin">(
    currentRole,
  );
  const router = useRouter();
  const toast = useToast();

  function handleAdjust() {
    const d = Number(delta);
    if (!Number.isFinite(d) || d === 0) {
      toast.error(
        locale === "fr" ? "Saisis un montant non nul." : "Enter a non-zero amount.",
      );
      return;
    }
    if (reason.trim().length < 3) {
      toast.error(
        locale === "fr" ? "Raison trop courte." : "Reason too short.",
      );
      return;
    }
    startTransition(async () => {
      const res = await adjustBalance({
        user_id: userId,
        delta_tokens: Math.round(d),
        reason: reason.trim(),
      });
      if (res.ok) {
        toast.success(
          locale === "fr" ? "Solde mis à jour." : "Balance updated.",
        );
        setOpen(false);
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
      const res = await setUserRole({
        user_id: userId,
        new_role: newRole,
      });
      if (res.ok) {
        toast.success(locale === "fr" ? "Rôle mis à jour." : "Role updated.");
        setOpen(false);
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
        {locale === "fr" ? "Gérer" : "Manage"}
      </button>

      {open && (
        <div className="fixed inset-0 z-[150]" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-abyss/80 backdrop-blur-sm"
          />
          <div className="absolute left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-4">
            <div className="overflow-hidden rounded-[14px] border border-white/[0.1] bg-abyss/95 shadow-2xl backdrop-blur-2xl">
              <header className="border-b border-white/[0.08] px-5 py-4">
                <h3 className="font-display text-lg font-semibold text-text-primary">
                  {locale === "fr" ? "Gérer" : "Manage"} @{username}
                </h3>
              </header>

              <div className="space-y-5 p-5">
                {/* Adjust balance */}
                <section>
                  <div className="mb-2 flex items-center gap-2">
                    <Coins className="size-4 text-primary-400" strokeWidth={1.7} />
                    <h4 className="text-sm font-bold text-text-primary">
                      {locale === "fr" ? "Ajuster le solde" : "Adjust balance"}
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
                        className="flex-1 rounded-[8px] border border-white/[0.1] bg-abyss/[0.6] px-3 py-2 text-sm tabular-nums text-text-primary outline-none focus:border-primary-500/50"
                      />
                      <span className="text-xs text-text-tertiary">
                        {locale === "fr" ? "jetons" : "tokens"}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      maxLength={200}
                      placeholder={
                        locale === "fr"
                          ? "Raison (ex: bonus participation)"
                          : "Reason (e.g. participation bonus)"
                      }
                      className="w-full rounded-[8px] border border-white/[0.1] bg-abyss/[0.6] px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-primary-500/50"
                    />
                    <button
                      type="button"
                      onClick={handleAdjust}
                      disabled={isPending}
                      className={cn(
                        "inline-flex w-full items-center justify-center gap-1.5 rounded-[8px] px-4 py-2 text-sm font-bold transition",
                        isPending
                          ? "bg-white/[0.06] text-text-tertiary"
                          : "bg-primary-500 text-abyss shadow-glow-primary hover:bg-primary-400",
                      )}
                    >
                      {isPending && (
                        <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />
                      )}
                      {locale === "fr" ? "Appliquer" : "Apply"}
                    </button>
                  </div>
                </section>

                {/* Role */}
                {isSuperAdmin && (
                  <section className="border-t border-white/[0.08] pt-4">
                    <div className="mb-2 flex items-center gap-2">
                      <ShieldCheck className="size-4 text-gold-400" strokeWidth={1.7} />
                      <h4 className="text-sm font-bold text-text-primary">
                        {locale === "fr" ? "Rôle" : "Role"}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={newRole}
                        onChange={(e) =>
                          setNewRole(
                            e.target.value as
                              | "player"
                              | "admin"
                              | "super_admin",
                          )
                        }
                        className="flex-1 rounded-[8px] border border-white/[0.1] bg-abyss/[0.6] px-3 py-2 text-sm text-text-primary outline-none focus:border-primary-500/50"
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
                          "inline-flex items-center gap-1 rounded-[8px] px-3 py-2 text-xs font-bold transition",
                          newRole === currentRole
                            ? "bg-white/[0.06] text-text-tertiary"
                            : "bg-gold-500 text-abyss hover:bg-gold-400",
                        )}
                      >
                        {locale === "fr" ? "Changer" : "Set"}
                      </button>
                    </div>
                  </section>
                )}

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-full rounded-md px-3 py-1.5 text-xs text-text-tertiary hover:text-text-primary"
                >
                  {locale === "fr" ? "Fermer" : "Close"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
