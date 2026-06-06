import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  getAppSettings,
  effectiveBuyInDeadline,
  isBuyInDeadlinePassed,
} from "@/lib/admin/economy";
import { SettingsForm } from "@/components/admin/settings-form";
import { AdminFillPredictions } from "@/components/admin/admin-fill-predictions";
import { ArrowRight, Coins, Settings, ShieldCheck } from "lucide-react";
import type { Locale } from "@/i18n/routing";

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const L = locale as Locale;
  const fr = L === "fr";

  const settings = await getAppSettings();

  return (
    <div className="space-y-6">
      <header>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/[0.08] px-3 py-1 text-xs font-bold uppercase tracking-wider text-violet-300">
          <Settings className="size-3.5" strokeWidth={2} />
          {fr ? "Réglages" : "Settings"}
        </div>
        <h1 className="font-display text-2xl font-semibold text-text-primary sm:text-3xl">
          {fr ? "Réglages généraux" : "General settings"}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-text-secondary">
          {fr
            ? "Fenêtre du tournoi et coordonnées de paiement. Le prix d'accès, la devise et le partage de la cagnotte se règlent dans Économie."
            : "Tournament window and payment details. Access price, currency, and the prize split live in Economy."}
        </p>
      </header>

      <SettingsForm
        initial={{
          tournament_start_at: settings.tournament_start_at ?? null,
          tournament_end_at: settings.tournament_end_at ?? null,
          contact_label: settings.contact_label,
          contact_info: settings.contact_info,
        }}
        locale={L}
      />

      <AdminFillPredictions
        locale={L}
        deadlineLabel={effectiveBuyInDeadline(settings).toLocaleString(
          fr ? "fr-CA" : "en-CA",
          {
            timeZone: "America/Toronto",
            dateStyle: "medium",
            timeStyle: "short",
          },
        )}
        deadlinePassed={isBuyInDeadlinePassed(settings)}
      />

      <Link
        href="/admin/economy"
        className="group flex items-center gap-3 rounded-md border border-gold-500/25 bg-gold-500/[0.05] p-4 transition hover:bg-gold-500/[0.09]"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-gold-500/15 text-gold-300 ring-1 ring-gold-500/25">
          <Coins className="size-4" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-display text-sm font-semibold text-text-primary">
            {fr ? "Économie & cagnotte" : "Economy & prize pool"}
          </div>
          <div className="text-xs text-text-tertiary">
            {fr
              ? "Prix d'accès, devise, date butoir, partage du pot."
              : "Access price, currency, deadline, prize split."}
          </div>
        </div>
        <ArrowRight
          className="size-4 text-gold-300 transition group-hover:translate-x-0.5"
          strokeWidth={2}
        />
      </Link>

      <p className="flex items-center gap-1.5 text-xs text-text-tertiary">
        <ShieldCheck className="size-3.5" strokeWidth={1.7} />
        {fr
          ? "Chaque modification est tracée dans le journal d'audit."
          : "Every change is recorded in the audit log."}
      </p>
    </div>
  );
}
