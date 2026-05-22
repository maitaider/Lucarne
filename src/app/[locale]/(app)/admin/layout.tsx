import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { isAdmin } from "@/lib/admin/queries";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { ShieldCheck } from "lucide-react";
import type { Locale } from "@/i18n/routing";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = (await getLocale()) as Locale;
  const admin = await isAdmin();
  if (!admin) redirect({ href: "/dashboard", locale });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex items-center gap-3 rounded-[10px] border border-white/[0.1] bg-surface-1/[0.66] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl">
        <div className="flex size-9 items-center justify-center rounded-lg bg-gold-500/15 text-gold-400 ring-1 ring-gold-500/30 shadow-glow-gold">
          <ShieldCheck className="size-5" strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-xl font-semibold text-text-primary">
            {locale === "fr" ? "Panneau admin" : "Admin panel"}
          </h1>
          <p className="text-xs text-text-tertiary">
            {locale === "fr"
              ? "Argent réel, économie, paris et joueurs · toutes les actions sont tracées."
              : "Real money, economy, bets, and players · every action is audited."}
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[14rem_1fr]">
        <AdminSidebar locale={locale} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
