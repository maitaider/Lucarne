import { Link } from "@/i18n/navigation";
import { MessagesSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/user-avatar";
import { listChatMessages } from "@/lib/chat/queries";
import type { Locale } from "@/i18n/routing";

/**
 * Dashboard "Salon" preview — a compact, self-fetching server card showing the
 * last few global-chat messages with a link into /chat. Server Component: it
 * awaits its own data (a small `listChatMessages` read) so the dashboard page
 * only has to render `<ChatPreviewCard locale={L} />`.
 *
 * Bodies are shown as plain truncated text on purpose (the rich renderer
 * `message-body` is a client component with mentions/prono chips — overkill for
 * a one-line preview).
 */
export async function ChatPreviewCard({ locale }: { locale: Locale }) {
  const fr = locale === "fr";
  const messages = await listChatMessages(6);
  const recent = messages.slice(-4); // already chronological (oldest → newest)

  return (
    <Card padded="none" accent="violet">
      <header className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-text-primary">
          <MessagesSquare className="size-4 text-violet-300" strokeWidth={1.7} />
          {fr ? "Salon" : "Lounge"}
        </h2>
        <Link
          href="/chat"
          className="text-xs font-medium text-text-secondary transition hover:text-text-primary"
        >
          {fr ? "Ouvrir →" : "Open →"}
        </Link>
      </header>

      {recent.length === 0 ? (
        <Link
          href="/chat"
          className="block px-4 py-6 text-center text-sm text-text-tertiary transition hover:text-text-secondary"
        >
          {fr
            ? "Personne n'a encore écrit — lance la discussion."
            : "No messages yet — start the conversation."}
        </Link>
      ) : (
        <>
          <ul className="divide-y divide-white/[0.05]">
            {recent.map((m) => {
              const name = m.author.display_name ?? m.author.username;
              const time = new Date(m.created_at).toLocaleTimeString(
                fr ? "fr-CA" : "en-CA",
                { hour: "2-digit", minute: "2-digit", timeZone: "America/Toronto" },
              );
              return (
                <li key={m.id} className="flex items-start gap-2.5 px-4 py-2.5">
                  <UserAvatar
                    src={m.author.avatar_url}
                    name={name}
                    className="size-7 shrink-0 rounded-full ring-1 ring-white/10"
                    fallbackClassName="bg-violet-500/20 text-[10px] font-bold text-violet-200"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="truncate text-xs font-semibold text-text-primary">
                        {name}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-text-tertiary">
                        {time}
                      </span>
                    </div>
                    <p className="truncate text-xs text-text-secondary">
                      {m.body}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          <Link
            href="/chat"
            className="block border-t border-white/[0.06] px-4 py-2.5 text-center text-xs font-medium text-violet-300 transition hover:bg-white/[0.03]"
          >
            {fr ? "Rejoindre la conversation →" : "Join the conversation →"}
          </Link>
        </>
      )}
    </Card>
  );
}
