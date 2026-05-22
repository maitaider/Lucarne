import { setRequestLocale } from "next-intl/server";
import { listMyNotifications } from "@/lib/notifications/queries";
import { getCurrentUser } from "@/lib/profile/queries";
import { NotificationsList } from "@/components/notifications/notifications-list";
import { Bell } from "lucide-react";
import type { Locale } from "@/i18n/routing";

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const L = locale as Locale;

  const [user, items] = await Promise.all([
    getCurrentUser(),
    listMyNotifications(100),
  ]);
  const unread = items.filter((n) => !n.read_at).length;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex items-center justify-between gap-3 rounded-[10px] border border-white/[0.1] bg-surface-1/[0.55] p-5 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-primary-500/[0.12] text-primary-300 ring-1 ring-primary-500/30">
            <Bell className="size-5" strokeWidth={1.7} />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold text-text-primary">
              {L === "fr" ? "Notifications" : "Notifications"}
            </h1>
            <p className="text-xs text-text-tertiary">
              {unread > 0
                ? L === "fr"
                  ? `${unread} non-lue${unread > 1 ? "s" : ""}`
                  : `${unread} unread`
                : L === "fr"
                  ? "Tout est lu"
                  : "All caught up"}
            </p>
          </div>
        </div>
      </header>

      <NotificationsList initial={items} locale={L} userId={user?.id ?? ""} />
    </main>
  );
}
