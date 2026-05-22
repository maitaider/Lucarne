import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { isAdmin } from "@/lib/admin/queries";
import { Link } from "@/i18n/navigation";
import { ShieldCheck, ClipboardList, Trophy, FileText } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const admin = await isAdmin();
  if (!admin) redirect({ href: "/dashboard", locale });

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 lg:px-8">
      <header className="mb-6 flex items-center gap-3 rounded-[8px] border border-white/[0.1] bg-surface-1/[0.66] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl">
        <div className="flex size-9 items-center justify-center rounded-lg bg-gold-500/15 text-gold-400 ring-1 ring-gold-500/20">
          <ShieldCheck className="size-5" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="font-display text-xl font-semibold text-text-primary">
            Admin
          </h1>
          <p className="text-xs text-text-tertiary">
            {locale === "fr"
              ? "Mode administrateur — actions tracées dans l'audit log."
              : "Admin mode — actions are logged in audit trail."}
          </p>
        </div>
      </header>

      <nav className="mb-8 flex flex-wrap gap-2 border-b border-white/[0.08] pb-4">
        <AdminLink href="/admin/validations" icon={ClipboardList} label="Validations" />
        <AdminLink href="/admin/matches" icon={Trophy} label="Matchs" />
        <AdminLink href="/admin/audit" icon={FileText} label="Audit" />
      </nav>

      {children}
    </div>
  );
}

function AdminLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof ShieldCheck;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-[8px] border border-transparent px-3 py-1.5 text-sm font-medium text-text-secondary transition hover:border-white/[0.08] hover:bg-white/[0.05] hover:text-text-primary"
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}
