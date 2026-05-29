"use client";

import { useState, useTransition } from "react";
import { generateUserInvitation } from "@/lib/leagues/actions";
import {
  Check,
  Copy,
  Link2,
  Loader2,
  Share2,
  Ticket,
  UserPlus,
} from "lucide-react";

/**
 * Account-level invite generator available to every user. Produces a code and
 * a prefilled sign-up link to share with friends, who then create their own
 * account and play the global pool.
 */
export function InviteFriendsCard({ locale }: { locale: "fr" | "en" }) {
  const fr = locale === "fr";
  const [days, setDays] = useState(14);
  const [maxUses, setMaxUses] = useState(1);
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [pending, startTransition] = useTransition();

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const link = code ? `${origin}/${locale}/signup?code=${code}` : "";

  function onGenerate() {
    setError(null);
    setCode(null);
    startTransition(async () => {
      const res = await generateUserInvitation(days, maxUses);
      if (!res.ok) {
        setError(res.message ?? "Erreur");
        return;
      }
      setCode(res.code ?? null);
    });
  }

  function copy(text: string, which: "code" | "link") {
    navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  }

  async function share() {
    if (!link) return;
    const shareData = {
      title: "Lucarne",
      text: fr
        ? "Rejoins-moi sur Lucarne pour pronostiquer la Coupe du Monde 2026 ⚽"
        : "Join me on Lucarne to predict the 2026 World Cup ⚽",
      url: link,
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        /* user cancelled */
      }
    } else {
      copy(link, "link");
    }
  }

  const fieldCls =
    "w-full rounded-[8px] border border-white/[0.1] bg-abyss/[0.5] px-3 py-2 text-sm text-text-primary outline-none transition focus:border-primary-500";

  return (
    <div className="rounded-[14px] border border-primary-500/25 bg-surface-1/[0.66] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl sm:p-6">
      <div className="mb-1 flex items-center gap-2">
        <UserPlus className="size-4 text-primary-300" strokeWidth={1.8} />
        <h2 className="font-display text-base font-semibold text-text-primary">
          {fr ? "Ton invitation" : "Your invite"}
        </h2>
      </div>
      <p className="mb-4 text-sm text-text-secondary">
        {fr
          ? "Choisis la durée et le nombre d'utilisations, puis partage le code ou le lien."
          : "Pick a duration and number of uses, then share the code or link."}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-text-secondary">
            {fr ? "Expire (jours)" : "Expires (days)"}
          </span>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className={fieldCls}
          >
            {[1, 7, 14, 30].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-text-secondary">
            {fr ? "Utilisations" : "Uses"}
          </span>
          <select
            value={maxUses}
            onChange={(e) => setMaxUses(Number(e.target.value))}
            className={fieldCls}
          >
            {[1, 5, 10, 25].map((u) => (
              <option key={u} value={u}>
                {u === 1 ? (fr ? "1 personne" : "1 person") : `${u}`}
              </option>
            ))}
          </select>
        </label>
      </div>

      {code && (
        <div className="mt-4 space-y-3">
          {/* Code */}
          <div className="rounded-[10px] border border-primary-500/30 bg-primary-500/10 p-4">
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary-300">
              <Ticket className="size-3" strokeWidth={2.5} />
              {fr ? "Code d'invitation" : "Invite code"}
            </div>
            <div className="flex items-center justify-between gap-3">
              <code className="font-mono text-2xl font-bold tracking-widest text-primary-200">
                {code}
              </code>
              <button
                type="button"
                onClick={() => copy(code, "code")}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-[8px] bg-primary-500/20 px-3 py-1.5 text-xs font-semibold text-primary-200 transition hover:bg-primary-500/30"
              >
                {copied === "code" ? (
                  <Check className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                {copied === "code" ? (fr ? "Copié" : "Copied") : fr ? "Copier" : "Copy"}
              </button>
            </div>
          </div>

          {/* Shareable link */}
          <div className="rounded-[10px] border border-white/[0.08] bg-white/[0.03] p-3">
            <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
              <Link2 className="size-3" strokeWidth={2.5} />
              {fr ? "Lien d'inscription (code pré-rempli)" : "Sign-up link (code prefilled)"}
            </div>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={link}
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 truncate rounded-[8px] border border-white/[0.08] bg-abyss/[0.5] px-2.5 py-1.5 font-mono text-xs text-text-secondary outline-none"
              />
              <button
                type="button"
                onClick={() => copy(link, "link")}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-[8px] border border-white/[0.12] bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-text-primary transition hover:bg-white/[0.1]"
              >
                {copied === "link" ? (
                  <Check className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                {copied === "link" ? (fr ? "Copié" : "Copied") : fr ? "Copier" : "Copy"}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={share}
            className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-white/[0.12] bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-text-primary transition hover:border-primary-500/45 hover:bg-primary-500/[0.1]"
          >
            <Share2 className="size-4" strokeWidth={1.8} />
            {fr ? "Partager" : "Share"}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-[8px] border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={onGenerate}
        disabled={pending}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-primary-500 px-5 py-2.5 text-sm font-semibold text-abyss shadow-glow-primary transition hover:bg-primary-400 active:scale-[0.99] disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Ticket className="size-4" strokeWidth={1.8} />
        )}
        {code
          ? fr
            ? "Générer un autre code"
            : "Generate another code"
          : fr
            ? "Générer mon invitation"
            : "Generate my invite"}
      </button>
    </div>
  );
}
