import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getPlayerById } from "@/lib/players/queries";
import { computeAge } from "@/lib/players/age";
import { getTeamByCode } from "@/data/world-cup-2026";
import { Flag } from "@/components/team/flag";
import {
  ArrowLeft,
  Building2,
  Cake,
  CalendarClock,
  Globe2,
  Shirt,
  Trophy,
  Users,
} from "lucide-react";
import type { Locale } from "@/i18n/routing";

const POSITION_LABEL: Record<string, { fr: string; en: string }> = {
  GK: { fr: "Gardien", en: "Goalkeeper" },
  DEF: { fr: "Défenseur", en: "Defender" },
  MID: { fr: "Milieu", en: "Midfielder" },
  FWD: { fr: "Attaquant", en: "Forward" },
};

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const L = locale as Locale;
  const fr = L === "fr";

  const player = await getPlayerById(id);
  if (!player) notFound();

  const team = getTeamByCode(player.team_fifa_code);
  const teamName = fr ? player.team_name_fr : player.team_name_en;
  const age = computeAge(player.birth_date);
  const posLabel = player.position ? POSITION_LABEL[player.position] : null;
  const positionText = posLabel ? (fr ? posLabel.fr : posLabel.en) : player.position;

  const dob = player.birth_date
    ? new Intl.DateTimeFormat(fr ? "fr-FR" : "en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${player.birth_date}T00:00:00Z`))
    : null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-8 lg:px-8">
      <Link
        href={`/teams/${player.team_fifa_code}`}
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-text-secondary transition hover:text-text-primary"
      >
        <ArrowLeft className="size-4" />
        {fr ? `Effectif — ${teamName}` : `Squad — ${teamName}`}
      </Link>

      {/* Hero */}
      <section className="relative isolate overflow-hidden rounded-lg border border-white/[0.1] bg-surface-1/[0.72] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-8">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_70%_at_15%_0%,rgba(34,217,130,0.10),transparent_60%)]"
        />
        <div className="flex items-center gap-5">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-[14px] bg-primary-500/10 font-mono text-2xl font-bold text-primary-300 ring-1 ring-primary-500/25">
            {player.shirt_number ?? "–"}
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-semibold leading-tight text-text-primary sm:text-4xl">
              {player.display_name}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {positionText && (
                <Badge icon={Shirt} tone="primary">
                  {positionText}
                </Badge>
              )}
              {age != null && (
                <Badge icon={Cake} tone="violet">
                  {age} {fr ? "ans" : "yrs"}
                </Badge>
              )}
              <Link href={`/teams/${player.team_fifa_code}`}>
                <Badge tone="steel" interactive>
                  <Flag
                    isoCode={player.team_iso_code?.toLowerCase() ?? null}
                    size="xs"
                    className="!h-3.5 !w-5 rounded-[2px] ring-1 ring-white/10"
                  />
                  {teamName}
                </Badge>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Details */}
      <section className="mt-5 grid gap-2 sm:grid-cols-2">
        <InfoRow icon={Building2} label={fr ? "Club actuel" : "Current club"}>
          {player.club ?? "—"}
        </InfoRow>
        <InfoRow icon={Cake} label={fr ? "Date de naissance" : "Date of birth"}>
          {dob ?? "—"}
          {dob && age != null && (
            <span className="text-text-tertiary">
              {" "}
              · {age} {fr ? "ans" : "yrs"}
            </span>
          )}
        </InfoRow>
        <InfoRow icon={Shirt} label={fr ? "Poste" : "Position"}>
          {positionText ?? "—"}
        </InfoRow>
        <InfoRow icon={Users} label={fr ? "Numéro" : "Number"}>
          {player.shirt_number != null ? `#${player.shirt_number}` : "—"}
        </InfoRow>
        <InfoRow icon={Globe2} label={fr ? "Sélection" : "National team"}>
          {teamName}
          {team && (
            <span className="text-text-tertiary">
              {" "}
              · {fr ? "Groupe" : "Group"} {team.group_label}
            </span>
          )}
        </InfoRow>
        <InfoRow icon={Trophy} label={fr ? "Confédération" : "Confederation"}>
          {player.team_confederation || "—"}
        </InfoRow>
      </section>

      {/* CTAs */}
      <div className="mt-6 flex flex-wrap gap-2.5">
        <Link
          href={`/teams/${player.team_fifa_code}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.04] px-4 py-2 text-sm font-medium text-text-primary transition hover:border-primary-500/40 hover:bg-white/[0.07]"
        >
          <Users className="size-4" strokeWidth={1.7} />
          {fr ? `Effectif complet — ${teamName}` : `Full squad — ${teamName}`}
        </Link>
        <Link
          href="/predict"
          className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/35 bg-gold-500/[0.08] px-4 py-2 text-sm font-medium text-gold-200 transition hover:bg-gold-500/[0.14]"
        >
          <CalendarClock className="size-4" strokeWidth={1.7} />
          {fr ? "Pronostique" : "Make a prediction"}
        </Link>
      </div>
    </main>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Users;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[10px] border border-white/[0.06] bg-white/[0.025] px-4 py-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-text-tertiary" strokeWidth={1.7} />
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary">
          {label}
        </div>
        <div className="mt-0.5 truncate text-sm font-semibold text-text-primary">
          {children}
        </div>
      </div>
    </div>
  );
}

function Badge({
  icon: Icon,
  tone,
  interactive = false,
  children,
}: {
  icon?: typeof Users;
  tone: "primary" | "violet" | "steel" | "gold";
  interactive?: boolean;
  children: React.ReactNode;
}) {
  const toneCls = {
    primary: "border-primary-500/30 bg-primary-500/[0.08] text-primary-300",
    violet: "border-violet-500/30 bg-violet-500/[0.08] text-violet-300",
    steel: "border-white/[0.12] bg-white/[0.05] text-text-secondary",
    gold: "border-gold-500/35 bg-gold-500/[0.08] text-gold-300",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${toneCls} ${interactive ? "transition hover:brightness-125" : ""}`}
    >
      {Icon && <Icon className="size-3.5" strokeWidth={2} />}
      {children}
    </span>
  );
}
