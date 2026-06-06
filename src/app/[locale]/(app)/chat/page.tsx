import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { MessagesSquare, Users } from "lucide-react";
import { getCurrentUser, isAdminRole } from "@/lib/profile/queries";
import {
  listChatMessages,
  listChatMembers,
  listChatMutes,
  listLiveMatches,
} from "@/lib/chat/queries";
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

  const [messages, members, mutes, liveMatches] = await Promise.all([
    listChatMessages(),
    listChatMembers(),
    listChatMutes(),
    listLiveMatches(),
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
        stats={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-text-secondary">
              <Users className="size-3.5 text-violet-300" strokeWidth={2} />
              {members.length} {L === "fr" ? "membres" : "members"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-500/25 bg-primary-500/[0.08] px-2.5 py-1 text-xs font-medium text-primary-200">
              <span className="size-1.5 animate-pulse rounded-full bg-primary-400" />
              {L === "fr" ? "Temps réel" : "Realtime"}
            </span>
          </>
        }
      />
      <ChatRoom
        initialMessages={messages}
        members={members}
        initialMutes={mutes}
        initialLiveMatches={liveMatches}
        currentUserId={user.id}
        isAdmin={isAdminRole(user.role)}
        locale={L}
      />
    </AppPageShell>
  );
}
