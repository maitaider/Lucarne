import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSharedPrediction, type SharedPrediction } from "@/lib/social/share";
import { Flag } from "@/components/team/flag";
import { Trophy, ArrowRight, Lock, CheckCircle2, XCircle } from "lucide-react";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; betId: string }>;
}): Promise<Metadata> {
  const { locale, betId } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const pred = await getSharedPrediction(betId);
  if (!pred) return { title: t("sharedTitleFallback") };
  const home = (locale === "en" ? pred.home.name_en : pred.home.name_fr) ?? "?";
  const away = (locale === "en" ? pred.away.name_en : pred.away.name_fr) ?? "?";
  const sc = parseScore(pred.payload);
  const line = sc ? `${sc.home}–${sc.away}` : "vs";
  return {
    title: `@${pred.username} — ${home} ${line} ${away}`,
    description: t("sharedDescription", { username: pred.username }),
  };
}

export default async function SharedPredictionPage({
  params,
}: {
  params: Promise<{ locale: string; betId: string }>;
}) {
  const { locale, betId } = await params;
  setRequestLocale(locale);
  const L = locale as Locale;
  const fr = L === "fr";

  const pred = await getSharedPrediction(betId);

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-lg flex-col items-center justify-center px-5 py-12">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 font-display text-lg font-bold tracking-tight text-text-primary"
      >
        <span className="text-primary-400">●</span> Lucarne
      </Link>

      {pred ? (
        <PredictionCard pred={pred} locale={L} />
      ) : (
        <div className="w-full rounded-md border border-white/[0.1] bg-surface-1/[0.6] p-8 text-center shadow-card backdrop-blur-xl">
          <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-white/[0.05] text-text-tertiary ring-1 ring-white/[0.1]">
            <Lock className="size-5" strokeWidth={1.6} />
          </span>
          <h1 className="font-display text-xl font-semibold text-text-primary">
            {fr ? "Pronostic non visible" : "Prediction not visible"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            {fr
              ? "Ce pronostic n'existe pas, ou reste caché jusqu'au coup d'envoi du match (anti-triche)."
              : "This prediction doesn't exist, or stays hidden until kickoff (anti-cheat)."}
          </p>
        </div>
      )}

      <JoinCta locale={L} />
    </main>
  );
}

function PredictionCard({
  pred,
  locale,
}: {
  pred: SharedPrediction;
  locale: Locale;
}) {
  const fr = locale === "fr";
  const homeName = (fr ? pred.home.name_fr : pred.home.name_en) ?? "?";
  const awayName = (fr ? pred.away.name_fr : pred.away.name_en) ?? "?";
  const predicted = parseScore(pred.payload);
  const finished = pred.match_status === "finished";
  const initials = (pred.display_name || pred.username)
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="w-full overflow-hidden rounded-[14px] border border-white/[0.12] bg-surface-1/[0.66] shadow-card backdrop-blur-xl">
      {/* Player */}
      <div className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-4">
        {pred.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pred.avatar_url}
            alt=""
            className="size-10 rounded-full object-cover ring-1 ring-white/[0.14]"
          />
        ) : (
          <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-500/30 to-violet-500/30 font-display text-sm font-bold uppercase text-text-primary ring-1 ring-white/[0.12]">
            {initials}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-primary">
            {pred.display_name || `@${pred.username}`}
          </p>
          <p className="font-mono text-[11px] text-text-tertiary">
            {fr ? "a pronostiqué" : "predicted"}
          </p>
        </div>
      </div>

      {/* Match + predicted scoreline */}
      <div className="px-5 py-6">
        <div className="flex items-center justify-center gap-3 sm:gap-4">
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <Flag isoCode={pred.home.iso} size="xl" className="ring-1 ring-white/15" />
            <span className="truncate text-center text-sm font-semibold text-text-primary">
              {homeName}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="rounded-full bg-primary-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-300 ring-1 ring-primary-500/30">
              {fr ? "Prono" : "Pick"}
            </span>
            <div className="mt-1 flex items-center gap-2 font-display text-4xl font-bold tabular-nums text-text-primary">
              <span>{predicted ? predicted.home : "?"}</span>
              <span className="text-text-tertiary">–</span>
              <span>{predicted ? predicted.away : "?"}</span>
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <Flag isoCode={pred.away.iso} size="xl" className="ring-1 ring-white/15" />
            <span className="truncate text-center text-sm font-semibold text-text-primary">
              {awayName}
            </span>
          </div>
        </div>

        {/* Final score + result, once finished */}
        {finished && (
          <div className="mt-5 flex flex-col items-center gap-2 border-t border-white/[0.07] pt-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
              {fr ? "Score final" : "Final score"}
            </p>
            <p className="font-display text-lg font-bold tabular-nums text-text-secondary">
              {pred.home.score ?? "–"} : {pred.away.score ?? "–"}
            </p>
            <ResultBadge result={pred.result} points={pred.points} fr={fr} />
          </div>
        )}
      </div>
    </div>
  );
}

function ResultBadge({
  result,
  points,
  fr,
}: {
  result: string | null;
  points: number;
  fr: boolean;
}) {
  if (result === "won") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-500/15 px-3 py-1 text-sm font-bold tabular-nums text-primary-300 ring-1 ring-primary-500/25">
        <CheckCircle2 className="size-4" strokeWidth={2.5} />
        {fr ? "Gagné" : "Won"} · +{points} pts
      </span>
    );
  }
  if (result === "lost") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-error/15 px-3 py-1 text-sm font-bold text-error ring-1 ring-error/25">
        <XCircle className="size-4" strokeWidth={2.5} />
        {fr ? "Manqué" : "Missed"}
      </span>
    );
  }
  return null;
}

function JoinCta({ locale }: { locale: Locale }) {
  const fr = locale === "fr";
  return (
    <div className="mt-6 w-full rounded-md border border-primary-500/25 bg-gradient-to-br from-primary-500/[0.1] to-transparent p-5 text-center">
      <span className="mx-auto mb-2 flex size-9 items-center justify-center rounded-full bg-primary-500/15 text-primary-300 ring-1 ring-primary-500/30">
        <Trophy className="size-4" strokeWidth={1.7} />
      </span>
      <p className="text-sm font-semibold text-text-primary">
        {fr
          ? "Fais tes pronos sur la Coupe du Monde 2026"
          : "Make your own World Cup 2026 predictions"}
      </p>
      <p className="mt-1 text-xs text-text-secondary">
        {fr
          ? "Lucarne — le pool de pronos entre amis, gratuit et scoré en points."
          : "Lucarne — the free, points-scored prediction pool with friends."}
      </p>
      <Link
        href="/signup"
        className="group mt-4 inline-flex items-center justify-center gap-2 rounded-[10px] bg-primary-500 px-5 py-2.5 text-sm font-semibold text-abyss transition hover:bg-primary-400"
      >
        {fr ? "Rejoindre Lucarne" : "Join Lucarne"}
        <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}

function parseScore(payload: unknown): { home: number; away: number } | null {
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    if (typeof p.home === "number" && typeof p.away === "number") {
      return { home: p.home, away: p.away };
    }
  }
  return null;
}
