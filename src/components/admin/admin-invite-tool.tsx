"use client";

import { useState, useTransition } from "react";
import { createLeague, generateInvitation } from "@/lib/leagues/actions";
import { Check, Copy, Loader2, Plus, Ticket } from "lucide-react";

type LeagueOpt = { id: string; name: string };

/**
 * One-stop admin onboarding tool: generate an invitation code without
 * digging into a league page. Invite codes are league-scoped, so if no
 * league exists yet, this creates the main pool inline first. Reuses the
 * same server actions as the per-league invite page.
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
  const [leagueId, setLeagueId] = useState(initialLeagues[0]?.id ?? "");
  const [newName, setNewName] = useState("");
  const [days, setDays] = useState(30);
  const [maxUses, setMaxUses] = useState(50);
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

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
        member_limit: 200,
        allows_real_money: false,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setLeagues((l) => [...l, { id: res.leagueId, name }]);
      setLeagueId(res.leagueId);
      setNewName("");
    });
  }

  function onGenerate() {
    setError(null);
    setCode(null);
    if (!leagueId) return;
    startTransition(async () => {
      const res = await generateInvitation(leagueId, days, maxUses);
      if (!res.ok) {
        setError(res.message ?? "Erreur");
        return;
      }
      setCode(res.code ?? null);
    });
  }

  function onCopy() {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const hasLeague = Boolean(leagueId);
  const fieldCls =
    "w-full rounded-[8px] border border-white/[0.1] bg-abyss/[0.5] px-3 py-2 text-sm text-text-primary outline-none transition focus:border-primary-500";

  return (
    <section className="rounded-[12px] border border-primary-500/25 bg-primary-500/[0.05] p-5 backdrop-blur-xl">
      <div className="mb-1 flex items-center gap-2">
        <Ticket className="size-4 text-primary-300" strokeWidth={1.8} />
        <h2 className="font-display text-base font-semibold text-text-primary">
          {fr ? "Inviter des joueurs" : "Invite players"}
        </h2>
      </div>
      <p className="mb-4 text-sm text-text-secondary">
        {fr
          ? "Génère un code d'invitation à partager. La personne le saisit sur la page d'inscription pour créer son compte."
          : "Generate an invite code to share. People enter it on the sign-up page to create their account."}
      </p>

      {!hasLeague ? (
        <div>
          <p className="mb-2 rounded-[8px] border border-gold-500/25 bg-gold-500/[0.07] px-3 py-2 text-xs text-gold-200">
            {fr
              ? "Aucune ligue pour l'instant. Les codes sont rattachés à une ligue — crée ta ligue principale d'abord (une seule fois)."
              : "No league yet. Codes belong to a league — create your main pool first (one time)."}
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
              className="inline-flex items-center justify-center gap-1.5 rounded-[8px] bg-primary-500 px-4 py-2 text-sm font-semibold text-abyss shadow-glow-primary transition hover:bg-primary-400 disabled:opacity-60"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" strokeWidth={2.5} />
              )}
              {fr ? "Créer la ligue" : "Create league"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {leagues.length > 1 && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-text-secondary">
                  {fr ? "Ligue" : "League"}
                </span>
                <select
                  value={leagueId}
                  onChange={(e) => setLeagueId(e.target.value)}
                  className={fieldCls}
                >
                  {leagues.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
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
                {fr ? "Utilisations max" : "Max uses"}
              </span>
              <select
                value={maxUses}
                onChange={(e) => setMaxUses(Number(e.target.value))}
                className={fieldCls}
              >
                {[1, 5, 10, 50].map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {code && (
            <div className="rounded-[10px] border border-primary-500/30 bg-primary-500/10 p-4">
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-primary-300">
                {fr ? "Nouveau code — partage-le" : "New code — share it"}
              </div>
              <div className="flex items-center justify-between gap-3">
                <code className="font-mono text-2xl font-bold tracking-widest text-primary-200">
                  {code}
                </code>
                <button
                  type="button"
                  onClick={onCopy}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-[8px] bg-primary-500/20 px-3 py-1.5 text-xs font-semibold text-primary-200 transition hover:bg-primary-500/30"
                >
                  {copied ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  {copied ? (fr ? "Copié" : "Copied") : fr ? "Copier" : "Copy"}
                </button>
              </div>
              <p className="mt-2 text-xs text-text-tertiary">
                {fr
                  ? "À saisir sur la page d'inscription (/signup) avec un @username, un e-mail et un mot de passe."
                  : "Entered on the sign-up page (/signup) with a @username, email, and password."}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={onGenerate}
            disabled={pending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-primary-500 px-5 py-2.5 text-sm font-semibold text-abyss shadow-glow-primary transition hover:bg-primary-400 active:scale-[0.99] disabled:opacity-60 sm:w-auto"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Ticket className="size-4" strokeWidth={1.8} />
            )}
            {fr ? "Générer un code" : "Generate code"}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-[8px] border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          {error}
        </div>
      )}
    </section>
  );
}
