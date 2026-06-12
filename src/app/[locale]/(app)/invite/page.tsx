import { setRequestLocale } from "next-intl/server";
import { UserPlus, Sparkles, Trophy, Users } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { InviteFriendsCard } from "@/components/invite/invite-friends-card";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const L = locale as Locale;
  const fr = L === "fr";

  const steps = fr
    ? [
        { icon: Sparkles, text: "Génère un code ou un lien ci-dessous." },
        { icon: Users, text: "Partage-le à tes amis (SMS, WhatsApp, e-mail…)." },
        { icon: Trophy, text: "Ils créent leur compte et jouent avec toi." },
      ]
    : [
        { icon: Sparkles, text: "Generate a code or link below." },
        { icon: Users, text: "Share it with friends (SMS, WhatsApp, email…)." },
        { icon: Trophy, text: "They create an account and play with you." },
      ];

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 lg:px-8">
      <header className="mb-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/[0.08] px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-300">
          <UserPlus className="size-3.5" strokeWidth={2} />
          {fr ? "Parrainage" : "Refer a friend"}
        </div>
        <h1 className="font-display text-3xl font-semibold leading-tight text-text-primary sm:text-4xl">
          {fr ? "Invite tes amis à jouer" : "Invite your friends to play"}
        </h1>
        <p className="mt-2 text-balance text-text-secondary">
          {fr
            ? "Plus on est de monde, plus la cagnotte grossit. Fais venir les gens que tu connais."
            : "The more players, the bigger the pot. Bring in the people you know."}
        </p>
      </header>

      <ol className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {steps.map(({ icon: Icon, text }, i) => (
          <li
            key={i}
            className="flex items-start gap-2.5 rounded-[10px] border border-white/[0.07] bg-surface-1/[0.5] p-3"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-primary-500/12 text-primary-300 ring-1 ring-primary-500/25">
              <Icon className="size-3.5" strokeWidth={1.9} />
            </span>
            <span className="text-xs leading-5 text-text-secondary">{text}</span>
          </li>
        ))}
      </ol>

      <InviteFriendsCard locale={L} />

      <p className="mt-4 text-center text-xs text-text-tertiary">
        {fr
          ? "Tes amis rejoignent automatiquement la ligue en s'inscrivant. Le code reste valable jusqu'à son expiration."
          : "Your friends automatically join the league when they sign up. The code stays valid until it expires."}
      </p>
    </main>
  );
}
