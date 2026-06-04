import { setRequestLocale } from "next-intl/server";
import {
  listChatReports,
  listMutedMembers,
  listRecentChatMessages,
  getChatModStats,
  getChatSlowmode,
} from "@/lib/chat/admin";
import { AdminChatPanel } from "@/components/admin/admin-chat-panel";
import type { Locale } from "@/i18n/routing";

export default async function AdminChatPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const L = locale as Locale;

  const [reports, muted, recent, stats, slowMode] = await Promise.all([
    listChatReports(),
    listMutedMembers(),
    listRecentChatMessages(),
    getChatModStats(),
    getChatSlowmode(),
  ]);

  return (
    <AdminChatPanel
      reports={reports}
      muted={muted}
      recent={recent}
      stats={stats}
      slowMode={slowMode}
      locale={L}
    />
  );
}
