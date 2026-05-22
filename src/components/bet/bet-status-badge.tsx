import { CheckCircle2, Clock, X } from "lucide-react";
import type { Locale } from "@/i18n/routing";

export function BetStatusBadge({
  status,
  result,
  locale,
}: {
  status: string;
  result: string | null;
  locale: Locale;
}) {
  if (status === "settled" && result === "won") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-400">
        <CheckCircle2 className="size-3" />
        {locale === "fr" ? "Gagné" : "Won"}
      </span>
    );
  }
  if (status === "settled" && result === "lost") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-error/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-error">
        <X className="size-3" />
        {locale === "fr" ? "Perdu" : "Lost"}
      </span>
    );
  }
  if (status === "settled" && (result === "push" || result === "void")) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-text-tertiary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
        {locale === "fr" ? "Remboursé" : "Push"}
      </span>
    );
  }
  if (status === "validated") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gold-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-400">
        <CheckCircle2 className="size-3" />
        {locale === "fr" ? "Validé" : "Validated"}
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-error/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-error">
        <X className="size-3" />
        {locale === "fr" ? "Rejeté" : "Rejected"}
      </span>
    );
  }
  if (status === "paid") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-400">
        <Clock className="size-3" />
        {locale === "fr" ? "Payé" : "Paid"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
      <Clock className="size-3" />
      {locale === "fr" ? "En attente" : "Pending"}
    </span>
  );
}
