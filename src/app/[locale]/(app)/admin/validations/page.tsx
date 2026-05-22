import { setRequestLocale } from "next-intl/server";
import { listValidationQueue } from "@/lib/admin/queries";
import { ValidationCard } from "./validation-card";
import { Receipt, ShieldCheck, Timer } from "lucide-react";

export default async function AdminValidationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const items = await listValidationQueue();

  return (
    <div>
      <header className="mb-6 rounded-[8px] border border-white/[0.1] bg-surface-1/[0.68] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl">
        <div>
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-[8px] border border-gold-500/30 bg-gold-500/[0.1] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-400 shadow-glow-gold">
            <ShieldCheck className="size-3.5" strokeWidth={1.7} />
            {locale === "fr" ? "Contrôle admin" : "Admin control"}
          </div>
          <h2 className="font-display text-2xl font-semibold text-text-primary">
            {locale === "fr" ? "File de validation" : "Validation queue"}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-text-secondary">
            {locale === "fr"
              ? `${items.length} pari${items.length > 1 ? "s" : ""} en attente. Vérifie les tickets avant qu’ils alimentent le classement et les portefeuilles.`
              : `${items.length} bet${items.length > 1 ? "s" : ""} pending. Review tickets before they affect standings and wallets.`}
          </p>
        </div>
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <AdminMetric
          icon={Timer}
          label={locale === "fr" ? "En attente" : "Pending"}
          value={items.length}
          accent="violet"
        />
        <AdminMetric
          icon={Receipt}
          label={locale === "fr" ? "Tickets" : "Tickets"}
          value={items.length}
          accent="primary"
        />
        <AdminMetric
          icon={ShieldCheck}
          label={locale === "fr" ? "Contrôle" : "Review"}
          value={locale === "fr" ? "Actif" : "Active"}
          accent="gold"
        />
      </section>

      {items.length === 0 ? (
        <div className="rounded-[8px] border border-dashed border-white/[0.14] bg-surface-1/[0.62] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur">
          <div className="flex items-start gap-3">
            <span className="rounded-[8px] bg-primary-500/15 p-2.5 text-primary-400 ring-1 ring-primary-500/30">
              <ShieldCheck className="size-5" strokeWidth={1.6} />
            </span>
            <div>
              <h3 className="font-display text-lg font-semibold text-text-primary">
                {locale === "fr" ? "File vide" : "Queue empty"}
              </h3>
              <p className="mt-1 text-sm leading-6 text-text-secondary">
                {locale === "fr"
                  ? "Aucun ticket à contrôler pour le moment. Les nouveaux paris apparaîtront ici avec le même traitement visuel."
                  : "No ticket needs review right now. New bets will appear here with the same visual treatment."}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <ValidationCard key={item.bet_id} item={item} locale={locale === "fr" ? "fr" : "en"} />
          ))}
        </div>
      )}
    </div>
  );
}

function AdminMetric({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Receipt;
  label: string;
  value: string | number;
  accent: "primary" | "gold" | "violet";
}) {
  const color = {
    primary: "border-primary-500/25 bg-primary-500/[0.09] text-primary-400",
    gold: "border-gold-500/30 bg-gold-500/[0.09] text-gold-400",
    violet: "border-violet-500/25 bg-violet-500/[0.09] text-violet-400",
  }[accent];

  return (
    <div className="rounded-[8px] border border-white/[0.08] bg-surface-1/[0.64] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
          {label}
        </span>
        <span className={`rounded-[8px] border p-1.5 ${color}`}>
          <Icon className="size-3.5" strokeWidth={1.7} />
        </span>
      </div>
      <div className="font-display text-2xl font-semibold tabular-nums text-text-primary">
        {value}
      </div>
    </div>
  );
}
