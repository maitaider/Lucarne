import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { MessagesSquare } from "lucide-react";
import { getCurrentUser, isAdminRole } from "@/lib/profile/queries";
import { listChatMessages, listChatMembers } from "@/lib/chat/queries";
import { ChatRoom } from "@/components/chat/chat-room";
import { AppPageShell } from "@/components/layout/app-page-shell";
import { PageHero } from "@/components/layout/page-hero";
import type { Locale } from "@/i18n/routing";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const L = locale as Locale;

  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: "/login", locale: L });
    return null;
  }

  const [messages, members] = await Promise.all([
    listChatMessages(),
    listChatMembers(),
  ]);

  return (
    <AppPageShell width="wide">
      <PageHero
        kicker={L === "fr" ? "Communauté" : "Community"}
        kickerIcon={MessagesSquare}
        accent="violet"
        title={L === "fr" ? "Salon" : "Lounge"}
        description={
          L === "fr"
            ? "Le tchat du groupe en temps réel — vannes, débats et pronos. Mentionne avec @, colle un lien de prono, réagis aux messages."
            : "The group's realtime chat — banter, debates and predictions. Mention with @, paste a prediction link, react to messages."
        }
        background="subtle"
      />
      <ChatRoom
        initialMessages={messages}
        members={members}
        currentUserId={user.id}
        isAdmin={isAdminRole(user.role)}
        locale={L}
      />
    </AppPageShell>
  );
}
