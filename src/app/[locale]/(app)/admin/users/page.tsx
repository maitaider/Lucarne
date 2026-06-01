import { setRequestLocale } from "next-intl/server";
import { listAdminUsers, formatMoney, getAppSettings } from "@/lib/admin/economy";
import { getCurrentUser } from "@/lib/profile/queries";
import { ManageUserButton } from "@/components/admin/user-actions";
import { CreateUserButton } from "@/components/admin/create-user-dialog";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Crown, ShieldCheck, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const L = locale as Locale;

  const [users, me, settings] = await Promise.all([
    listAdminUsers(),
    getCurrentUser(),
    getAppSettings(),
  ]);
  const isSuperAdmin = me?.role === "super_admin";
  const archivedCount = users.filter((u) => u.is_archived).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-text-primary">
            {L === "fr" ? "Joueurs" : "Players"}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {L === "fr"
              ? `${users.length} comptes${archivedCount > 0 ? ` · ${archivedCount} archivé${archivedCount > 1 ? "s" : ""}` : ""}. Ajoute, gère les rôles et l'accès, archive ou supprime.`
              : `${users.length} accounts${archivedCount > 0 ? ` · ${archivedCount} archived` : ""}. Add, manage roles and access, archive or delete.`}
          </p>
        </div>
        <CreateUserButton locale={L} isSuperAdmin={isSuperAdmin} />
      </header>

      <section className="overflow-hidden rounded-[12px] border border-white/[0.08] bg-surface-1/[0.55] backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/[0.08] bg-white/[0.03]">
              <tr className="text-[10px] uppercase tracking-wider text-text-tertiary">
                <th className="px-4 py-3 text-left font-bold">
                  {L === "fr" ? "Joueur" : "Player"}
                </th>
                <th className="px-4 py-3 text-left font-bold">
                  {L === "fr" ? "Rôle" : "Role"}
                </th>
                <th className="px-4 py-3 text-right font-bold">
                  {L === "fr" ? "Pronos" : "Picks"}
                </th>
                <th className="px-4 py-3 text-right font-bold">
                  {L === "fr" ? "Payé" : "Paid"}
                </th>
                <th className="px-4 py-3 text-right font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {users.map((u) => (
                <tr
                  key={u.id}
                  className={cn(
                    "transition hover:bg-white/[0.03]",
                    me?.id === u.id && "bg-primary-500/[0.04]",
                    u.is_archived && "bg-error/[0.03]",
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        src={u.avatar_url}
                        name={u.display_name ?? u.username}
                        className="size-9 ring-1 ring-white/[0.1]"
                        fallbackClassName={cn(
                          "bg-gradient-to-br font-mono text-[10px] font-bold text-text-primary",
                          u.role === "super_admin"
                            ? "from-gold-500/40 to-gold-500/10"
                            : u.role === "admin"
                              ? "from-violet-500/30 to-violet-500/10"
                              : "from-primary-500/25 to-violet-500/10",
                        )}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-text-primary">
                          {u.display_name ?? u.username}
                          {me?.id === u.id && (
                            <span className="ml-1.5 rounded-full bg-primary-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-400">
                              {L === "fr" ? "Toi" : "You"}
                            </span>
                          )}
                          {u.is_archived && (
                            <span className="ml-1.5 rounded-full bg-error/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-error">
                              {L === "fr" ? "Archivé" : "Archived"}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-text-tertiary">
                          @{u.username}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={u.role} locale={L} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-sm tabular-nums text-text-secondary">
                      {u.bets_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={cn(
                        "font-display text-sm font-semibold tabular-nums",
                        u.total_paid_cents > 0
                          ? "text-gold-300"
                          : "text-text-tertiary",
                      )}
                    >
                      {u.total_paid_cents > 0
                        ? formatMoney(u.total_paid_cents, settings.currency)
                        : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ManageUserButton
                      userId={u.id}
                      username={u.username}
                      currentRole={u.role}
                      isSuperAdmin={isSuperAdmin}
                      isArchived={u.is_archived}
                      canPurge={u.can_purge}
                      isSelf={me?.id === u.id}
                      locale={L}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function RoleBadge({
  role,
  locale,
}: {
  role: "player" | "admin" | "super_admin";
  locale: Locale;
}) {
  const config = {
    super_admin: {
      Icon: Crown,
      label: locale === "fr" ? "Super admin" : "Super admin",
      style: "bg-gold-500/15 text-gold-300 ring-gold-500/30",
    },
    admin: {
      Icon: ShieldCheck,
      label: "Admin",
      style: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
    },
    player: {
      Icon: User,
      label: locale === "fr" ? "Joueur" : "Player",
      style: "bg-white/[0.05] text-text-secondary ring-white/[0.1]",
    },
  }[role];
  const Icon = config.Icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1",
        config.style,
      )}
    >
      <Icon className="size-3" strokeWidth={2} />
      {config.label}
    </span>
  );
}
