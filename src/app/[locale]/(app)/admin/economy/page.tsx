import { setRequestLocale } from "next-intl/server";
import {
  getAppSettings,
  getOverviewStats,
} from "@/lib/admin/economy";
import { EconomyForm } from "@/components/admin/economy-form";
import type { Locale } from "@/i18n/routing";

export default async function AdminEconomyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const L = locale as Locale;

  const [settings, stats] = await Promise.all([
    getAppSettings(),
    getOverviewStats(),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-2xl font-semibold text-text-primary">
          {L === "fr" ? "Économie & règles" : "Economy & rules"}
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          {L === "fr"
            ? "Configure le prix d'accès, la devise, la date butoir et la répartition de la cagnotte. Tes changements sont visibles immédiatement par tous les joueurs."
            : "Configure access price, currency, deadline, and prize split. Your changes are visible to all players instantly."}
        </p>
      </header>

      <EconomyForm
        initial={{
          buy_in_amount_cents: settings.buy_in_amount_cents,
          buy_in_deadline: settings.buy_in_deadline,
          prize_distribution: settings.prize_distribution,
          contact_info: settings.contact_info,
          currency: settings.currency,
        }}
        totalCollectedCents={stats.net_cents}
        locale={L}
      />
    </div>
  );
}
