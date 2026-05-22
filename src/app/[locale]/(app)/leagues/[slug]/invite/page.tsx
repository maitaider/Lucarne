import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { getLeagueBySlug, listLeagueInvitations } from "@/lib/leagues/queries";
import { InviteGenerator } from "./invite-generator";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const league = await getLeagueBySlug(slug);
  if (!league) notFound();

  const invitations = await listLeagueInvitations(league.id);

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 lg:px-8">
      <Link
        href={`/leagues/${slug}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="size-4" />
        {league.name}
      </Link>

      <h1 className="mb-2 font-display text-3xl font-semibold tracking-tight text-text-primary">
        {locale === "fr" ? "Inviter des amis" : "Invite friends"}
      </h1>
      <p className="mb-8 text-text-secondary">
        {locale === "fr"
          ? "Génère un code d'invitation à partager. Chaque code peut être utilisé un nombre limité de fois."
          : "Generate an invitation code to share. Each code can be used a limited number of times."}
      </p>

      <InviteGenerator leagueId={league.id} locale={locale === "fr" ? "fr" : "en"} />

      <section className="mt-10">
        <h2 className="mb-4 font-display text-lg font-semibold tracking-tight text-text-secondary">
          {locale === "fr" ? "Codes actifs" : "Active codes"}
          <span className="ml-2 font-mono text-sm text-text-tertiary">
            {invitations.length}
          </span>
        </h2>
        {invitations.length === 0 ? (
          <p className="text-sm text-text-tertiary">
            {locale === "fr" ? "Aucun code actif." : "No active codes."}
          </p>
        ) : (
          <ul className="divide-y divide-border-subtle rounded-xl border border-border-subtle bg-surface-1/40 backdrop-blur">
            {invitations.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between px-5 py-3">
                <code className="font-mono text-sm uppercase tracking-wider text-primary-400">
                  {inv.code}
                </code>
                <div className="text-right text-xs text-text-tertiary">
                  <div>
                    {inv.uses} / {inv.max_uses}{" "}
                    {locale === "fr" ? "utilisations" : "uses"}
                  </div>
                  <div className="font-mono">
                    {locale === "fr" ? "expire" : "expires"}{" "}
                    {new Date(inv.expires_at).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US")}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
