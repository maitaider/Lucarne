import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { isAdmin } from "@/lib/admin/queries";
import { CreateLeagueForm } from "./create-league-form";
import type { Locale } from "@/i18n/routing";

export default async function NewLeaguePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const L = locale as Locale;

  // Gate: only admins/super_admins can create leagues for now.
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const admin = await isAdmin();
    if (!admin) redirect({ href: "/leagues", locale: L });
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 lg:px-8">
      <header className="mb-8 rounded-[8px] border border-white/[0.1] bg-surface-1/[0.66] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-gold-500/30 bg-gold-500/[0.1] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-400">
          {L === "fr" ? "Admin uniquement" : "Admin only"}
        </div>
        <h1 className="mb-2 font-display text-3xl font-semibold text-text-primary">
          {L === "fr" ? "Nouvelle ligue" : "New league"}
        </h1>
        <p className="text-text-secondary">
          {L === "fr"
            ? "Crée une ligue pour le groupe. Au lancement, seul l'admin peut créer des ligues — les autres rejoignent via code d'invitation."
            : "Create a league for the crew. At launch only admins can create leagues — others join via invite code."}
        </p>
      </header>
      <CreateLeagueForm locale={L === "fr" ? "fr" : "en"} />
    </main>
  );
}
