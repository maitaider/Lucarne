"use client";

import { useState, useTransition } from "react";
import { generateInvitation } from "@/lib/leagues/actions";
import { Loader2, Copy, Check } from "lucide-react";

export function InviteGenerator({
  leagueId,
  locale,
}: {
  leagueId: string;
  locale: "fr" | "en";
}) {
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [days, setDays] = useState(14);
  const [maxUses, setMaxUses] = useState(1);
  const [isPending, startTransition] = useTransition();

  function onGenerate() {
    setError(null);
    setCode(null);
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

  return (
    <div className="rounded-sm border border-white/[0.08] bg-surface-1/[0.72] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
      <div className="mb-5 grid grid-cols-2 gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-text-secondary">
            {locale === "fr" ? "Expiration (jours)" : "Expires (days)"}
          </label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="w-full rounded-lg border border-white/[0.1] bg-abyss/[0.48] px-3 py-2 text-sm text-text-primary outline-none focus:border-primary-500"
          >
            <option value={1}>1</option>
            <option value={7}>7</option>
            <option value={14}>14</option>
            <option value={30}>30</option>
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-text-secondary">
            {locale === "fr" ? "Utilisations max" : "Max uses"}
          </label>
          <select
            value={maxUses}
            onChange={(e) => setMaxUses(Number(e.target.value))}
            className="w-full rounded-lg border border-white/[0.1] bg-abyss/[0.48] px-3 py-2 text-sm text-text-primary outline-none focus:border-primary-500"
          >
            <option value={1}>1</option>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {code && (
        <div className="mb-5 rounded-sm border border-primary-500/30 bg-primary-500/5 p-4">
          <div className="mb-2 text-xs uppercase tracking-wider text-primary-400">
            {locale === "fr" ? "Nouveau code" : "New code"}
          </div>
          <div className="flex items-center justify-between gap-3">
            <code className="font-mono text-2xl font-bold tracking-widest text-primary-400">
              {code}
            </code>
            <button
              onClick={onCopy}
              className="inline-flex items-center gap-1.5 rounded-sm bg-primary-500/20 px-3 py-1.5 text-xs font-semibold text-primary-400 hover:bg-primary-500/30"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? (locale === "fr" ? "Copié" : "Copied") : (locale === "fr" ? "Copier" : "Copy")}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-3.5 py-2.5 text-sm text-error">
          {error}
        </div>
      )}

      <button
        onClick={onGenerate}
        disabled={isPending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-primary-500 px-4 py-2.5 text-sm font-semibold text-abyss shadow-glow-primary transition hover:bg-primary-400 disabled:opacity-60"
      >
        {isPending && <Loader2 className="size-4 animate-spin" />}
        {locale === "fr" ? "Générer un code" : "Generate code"}
      </button>
    </div>
  );
}
