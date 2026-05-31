"use client";

import { useState, useTransition } from "react";
import { createLeague, generateUserInvitation } from "@/lib/leagues/actions";
import {
  Check,
  Copy,
  Infinity as InfinityIcon,
  Link2,
  Loader2,
  Plus,
  Ticket,
} from "lucide-react";

type LeagueOpt = { id: string; name: string };

/**
 * Admin onboarding tool: create the house league (one time) and mint the
 * shared, unlimited-use invite code. Every player who redeems it auto-joins
 * the house league.
 */
export function AdminInviteTool({
  leagues: initialLeagues,
  locale,
}: {
  leagues: LeagueOpt[];
  locale: "fr" | "en";
}) {
  const fr = locale === "fr";
  const [leagues, setLeagues] = useState<LeagueOpt[]>(initialLeagues);
  const [newName, setNewName] = useState("");
  const [days, setDays] = useState(30);
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [pending, startTransition] = useTransition();

  // Only the admin creates leagues, so the first one is the house league.
  const houseLeague = leagues[0] ?? null;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = code ? `${origin}/${locale}/signup?code=${code}` : "";

  function slugify(s: string): string {
    const base = s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 36);
    return base.length >= 3 ? base : `pool-${base}`.slice(0, 40);
  }

  function onCreate() {
    setError(null);
    const name = newName.trim();
    if (name.length < 2) {
      setError(fr ? "Nom trop court (2 caractères min)." : "Name too short.");
      return;
    }
    startTransition(async () => {
      const res = await createLeague({
        name,
        slug: slugify(name),
        visibility: "private",
        member_limit: 500,
        allows_real_money: false,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setLeagues((l) => [...l, { id: res.leagueId, name }]);
      setNewName("");
    });
  }

  function onGenerate() {
    setError(null);
    setCode(null);
    startTransition(async () => {
      const res = await generateUserInvitation(days);
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

  const fieldCls =
    "w-full rounded-sm border border-white/[0.1] bg-abyss/[0.5] px-3 py-2 text-sm text-text-primary outline-none transition focus:border-primary-500";

  return (
    <section className="rounded-md border border-primary-500/25 bg-primary-500/[0.05] p-5 backdrop-blur-xl">
      <div className="mb-1 flex items-center gap-2">
        <Ticket className="size-4 text-primary-300" strokeWidth={1.8} />
        <h2 className="font-display text-base font-semibold text-text-primary">
          {fr ? "Inviter des joueurs" : "Invite players"}
        </h2>
      </div>
      <p className="mb-4 text-sm text-text-secondary">
        {fr
          ? "Un code unique et illimité. Chaque personne qui s'inscrit avec rejoint automatiquement la ligue maison."
          : "One shared, unlimited code. Everyone who signs up with it automatically joins the house league."}
      </p>

      {!houseLeague ? (
        <div>
          <p className="mb-2 rounded-sm border border-gold-500/25 bg-gold-500/[0.07] px-3 py-2 text-xs text-gold-200">
            {fr
              ? "Crée d'abord la ligue maison (une seule fois) — tous les joueurs la rejoindront."
              : "Create the house league first (one time) — every player will join it."}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={
                fr ? "Nom de la ligue (ex. Mondial des potes)" : "League name"
              }
              className={`${fieldCls} flex-1`}
            />
            <button
              type="button"
              onClick={onCreate}
              disabled={pending}
              className="inline-flex items-center justify-center gap-1.5 rounded-sm bg-primary-500 px-4 py-2 text-sm font-semibold text-abyss shadow-glow-primary transition hover:bg-primary-400 disabled:opacity-60"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" strokeWidth={2.5} />
              )}
              {fr ? "Créer la ligue maison" : "Create house league"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-sm border border-white/[0.08] bg-white/[0.03] px-3 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                {fr ? "Ligue maison" : "House league"}
              </div>
              <div className="truncate text-sm font-semibold text-text-primary">
                {houseLeague.name}
              </div>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-text-secondary">
                {fr ? "Expire (jours)" : "Expires (days)"}
              </span>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className={fieldCls}
              >
                {[7, 14, 30, 90].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {code && (
            <div className="space-y-3">
              <div className="rounded-[10px] border border-primary-500/30 bg-primary-500/10 p-4">
                <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary-300">
                  <Ticket className="size-3" strokeWidth={2.5} />
                  {fr ? "Code (utilisations illimitées)" : "Code (unlimited uses)"}
                  <InfinityIcon className="size-3" strokeWidth={2.5} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <code className="font-mono text-2xl font-bold tracking-widest text-primary-200">
                    {code}
                  </code>
                  <button
                    type="button"
                    onClick={() => copy(code, "code")}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-sm bg-primary-500/20 px-3 py-1.5 text-xs font-semibold text-primary-200 transition hover:bg-primary-500/30"
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

              <div className="flex items-center gap-2 rounded-[10px] border border-white/[0.08] bg-white/[0.03] p-3">
                <Link2 className="size-4 shrink-0 text-text-tertiary" strokeWidth={2} />
                <input
                  readOnly
                  value={link}
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 truncate bg-transparent font-mono text-xs text-text-secondary outline-none"
                />
                <button
                  type="button"
                  onClick={() => copy(link, "link")}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-sm border border-white/[0.12] bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-text-primary transition hover:bg-white/[0.1]"
                >
                  {copied === "link" ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  {copied === "link" ? (fr ? "Copié" : "Copied") : fr ? "Lien" : "Link"}
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onGenerate}
            disabled={pending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-primary-500 px-5 py-2.5 text-sm font-semibold text-abyss shadow-glow-primary transition hover:bg-primary-400 active:scale-[0.99] disabled:opacity-60 sm:w-auto"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Ticket className="size-4" strokeWidth={1.8} />
            )}
            {code
              ? fr
                ? "Générer un nouveau code"
                : "Generate a new code"
              : fr
                ? "Générer le code d'invitation"
                : "Generate invite code"}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-sm border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          {error}
        </div>
      )}
    </section>
  );
}
