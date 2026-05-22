import { setRequestLocale, getLocale } from "next-intl/server";
import { listValidationQueue } from "@/lib/admin/queries";
import { ValidationCard } from "./validation-card";

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
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-text-primary">
            {locale === "fr" ? "File de validation" : "Validation queue"}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {locale === "fr"
              ? `${items.length} pari${items.length > 1 ? "s" : ""} en attente`
              : `${items.length} bet${items.length > 1 ? "s" : ""} pending`}
          </p>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-strong bg-surface-1/40 p-10 text-center text-text-tertiary backdrop-blur">
          {locale === "fr" ? "File vide ✓" : "Queue empty ✓"}
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
