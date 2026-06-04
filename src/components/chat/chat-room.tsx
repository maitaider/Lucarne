"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Link } from "@/i18n/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import {
  postChatMessage,
  deleteChatMessage,
  setChatPin,
} from "@/lib/chat/actions";
import { CHAT_MAX_LEN } from "@/lib/chat/constants";
import type { ChatMember, ChatMessage } from "@/lib/chat/queries";
import type { ReactionSummary } from "@/lib/social/queries";
import { ReactionBar } from "@/components/social/reaction-bar";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useToast } from "@/components/ui/toast-provider";
import { MessageBody } from "./message-body";
import { cn } from "@/lib/utils";
import { Loader2, Pin, PinOff, Send, Smile, Trash2 } from "lucide-react";
import type { Locale } from "@/i18n/routing";

type Props = {
  initialMessages: ChatMessage[];
  members: ChatMember[];
  currentUserId: string;
  isAdmin: boolean;
  locale: Locale;
};

type ChatRow = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  pinned_at: string | null;
  deleted_at: string | null;
};

const EMPTY_REACTIONS: ReactionSummary = {
  counts: { fire: 0, clap: 0, laugh: 0, think: 0, shock: 0, skull: 0 },
  mine: [],
};

/** Active @mention token ending at the caret, or null. */
function getMentionQuery(
  text: string,
  caret: number,
): { start: number; query: string } | null {
  let i = caret - 1;
  while (i >= 0) {
    const ch = text[i];
    if (ch === "@") {
      const prev = i > 0 ? text[i - 1] : " ";
      if (i === 0 || /\s/.test(prev)) {
        const query = text.slice(i + 1, caret);
        if (/^[A-Za-z0-9_-]*$/.test(query)) return { start: i, query };
      }
      return null;
    }
    if (/\s/.test(ch)) return null;
    i--;
  }
  return null;
}

function formatTime(iso: string, locale: Locale): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return locale === "fr" ? "à l'instant" : "just now";
  if (min < 60) return locale === "fr" ? `${min} min` : `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} h`;
  return d.toLocaleDateString(locale === "fr" ? "fr-CA" : "en-CA", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChatRoom({
  initialMessages,
  members,
  currentUserId,
  isAdmin,
  locale,
}: Props) {
  const fr = locale === "fr";
  const toast = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const stickToBottomRef = useRef(true);

  // id → member, extendable when realtime surfaces an author we don't know yet.
  const membersByIdRef = useRef<Map<string, ChatMember>>(
    new Map(members.map((m) => [m.id, m])),
  );
  const memberUsernames = useMemo(
    () => new Set(members.map((m) => m.username.toLowerCase())),
    [members],
  );

  // --- @mention autocomplete ------------------------------------------------
  const [mention, setMention] = useState<{ start: number; query: string } | null>(
    null,
  );
  const [mentionIndex, setMentionIndex] = useState(0);
  const suggestions = useMemo(() => {
    if (!mention) return [];
    const q = mention.query.toLowerCase();
    return members
      .filter(
        (m) =>
          m.username.toLowerCase().startsWith(q) ||
          (q.length > 0 && m.display_name?.toLowerCase().includes(q)),
      )
      .slice(0, 6);
  }, [mention, members]);

  // --- Realtime: new messages, pin updates, cross-client deletes -------------
  useEffect(() => {
    const supabase = getSupabaseBrowser();

    function rowToMessage(row: ChatRow): ChatMessage {
      const a = membersByIdRef.current.get(row.user_id);
      return {
        id: row.id,
        user_id: row.user_id,
        body: row.body,
        created_at: row.created_at,
        pinned_at: row.pinned_at ?? null,
        author: a
          ? {
              username: a.username,
              display_name: a.display_name,
              avatar_url: a.avatar_url,
            }
          : { username: "…", display_name: null, avatar_url: null },
        reactions: { counts: { ...EMPTY_REACTIONS.counts }, mine: [] },
      };
    }

    async function resolveAuthor(userId: string) {
      if (membersByIdRef.current.has(userId)) return;
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .eq("id", userId)
        .maybeSingle();
      if (!data) return;
      membersByIdRef.current.set(userId, data as ChatMember);
      setMessages((prev) =>
        prev.map((m) =>
          m.user_id === userId && m.author.username === "…"
            ? {
                ...m,
                author: {
                  username: data.username,
                  display_name: data.display_name,
                  avatar_url: data.avatar_url,
                },
              }
            : m,
        ),
      );
    }

    const channel = supabase
      .channel("chat:global")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comments",
          filter: "parent_type=eq.global",
        },
        (payload) => {
          const row = payload.new as ChatRow;
          if (row.deleted_at) return;
          setMessages((prev) =>
            prev.some((m) => m.id === row.id) ? prev : [...prev, rowToMessage(row)],
          );
          if (!membersByIdRef.current.has(row.user_id)) void resolveAuthor(row.user_id);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "comments",
          filter: "parent_type=eq.global",
        },
        (payload) => {
          const row = payload.new as ChatRow;
          setMessages((prev) =>
            row.deleted_at
              ? prev.filter((m) => m.id !== row.id)
              : prev.map((m) =>
                  m.id === row.id
                    ? { ...m, pinned_at: row.pinned_at ?? null, body: row.body }
                    : m,
                ),
          );
        },
      )
      .on("broadcast", { event: "msg_deleted" }, ({ payload }) => {
        const id = (payload as { id?: string })?.id;
        if (id) setMessages((prev) => prev.filter((m) => m.id !== id));
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, []);

  // --- Auto-scroll ----------------------------------------------------------
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  // --- Actions --------------------------------------------------------------
  function submit() {
    const text = input.trim();
    if (!text || isPending) return;
    startTransition(async () => {
      const res = await postChatMessage(text, locale);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      setInput("");
      setMention(null);
      const row = res.message;
      const me = membersByIdRef.current.get(currentUserId);
      stickToBottomRef.current = true;
      setMessages((prev) =>
        prev.some((m) => m.id === row.id)
          ? prev
          : [
              ...prev,
              {
                id: row.id,
                user_id: row.user_id,
                body: row.body,
                created_at: row.created_at,
                pinned_at: null,
                author: me
                  ? {
                      username: me.username,
                      display_name: me.display_name,
                      avatar_url: me.avatar_url,
                    }
                  : { username: "…", display_name: null, avatar_url: null },
                reactions: { counts: { ...EMPTY_REACTIONS.counts }, mine: [] },
              },
            ],
      );
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deleteChatMessage(id, locale);
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== id));
        channelRef.current?.send({
          type: "broadcast",
          event: "msg_deleted",
          payload: { id },
        });
      } else {
        toast.error(res.message ?? "");
      }
    });
  }

  function handlePin(id: string, pinned: boolean) {
    startTransition(async () => {
      const res = await setChatPin(id, pinned, locale);
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === id
              ? { ...m, pinned_at: pinned ? new Date().toISOString() : null }
              : m,
          ),
        );
      } else {
        toast.error(res.message ?? "");
      }
    });
  }

  function selectMention(member: ChatMember) {
    if (!mention) return;
    const el = textareaRef.current;
    const caret = el?.selectionStart ?? input.length;
    const before = input.slice(0, mention.start);
    const after = input.slice(caret);
    const insert = `@${member.username} `;
    const next = before + insert + after;
    setInput(next);
    setMention(null);
    const pos = before.length + insert.length;
    requestAnimationFrame(() => {
      if (el) {
        el.focus();
        el.setSelectionRange(pos, pos);
      }
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mention && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectMention(suggestions[Math.min(mentionIndex, suggestions.length - 1)]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMention(null);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const pinned = useMemo(
    () =>
      messages
        .filter((m) => m.pinned_at)
        .sort((a, b) => (a.pinned_at! < b.pinned_at! ? 1 : -1)),
    [messages],
  );
  const remaining = CHAT_MAX_LEN - input.length;

  return (
    <section className="flex h-[68vh] min-h-[460px] max-h-[860px] flex-col overflow-hidden rounded-[14px] border border-white/[0.08] bg-surface-1/[0.5] shadow-card backdrop-blur-xl">
      {pinned.length > 0 && (
        <div className="shrink-0 border-b border-white/[0.08] bg-gold-500/[0.05] px-3 py-2 sm:px-4">
          <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gold-300">
            <Pin className="size-3" strokeWidth={2} />
            {fr ? "Épinglés" : "Pinned"}
          </p>
          <ul className="space-y-1">
            {pinned.map((m) => (
              <li
                key={`pin-${m.id}`}
                className="flex items-start gap-2 text-xs text-text-secondary"
              >
                <span className="font-semibold text-text-primary">
                  {m.author.display_name ?? `@${m.author.username}`}
                </span>
                <span className="min-w-0 flex-1 truncate">{m.body}</span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handlePin(m.id, false)}
                    aria-label={fr ? "Désépingler" : "Unpin"}
                    className="shrink-0 text-text-tertiary transition hover:text-gold-300"
                  >
                    <PinOff className="size-3.5" strokeWidth={1.7} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 space-y-0.5 overflow-y-auto px-2 py-4 sm:px-3"
      >
        {messages.length === 0 ? (
          <p className="py-12 text-center text-sm text-text-tertiary">
            {fr
              ? "Personne n'a encore parlé. Lance la discussion ⚽"
              : "No one's spoken yet. Start the conversation ⚽"}
          </p>
        ) : (
          <ul>
            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const grouped =
                !!prev &&
                prev.user_id === m.user_id &&
                !m.pinned_at &&
                new Date(m.created_at).getTime() -
                  new Date(prev.created_at).getTime() <
                  5 * 60_000;
              return (
                <MessageRow
                  key={m.id}
                  message={m}
                  grouped={grouped}
                  canModerate={isAdmin || m.user_id === currentUserId}
                  isAdmin={isAdmin}
                  memberUsernames={memberUsernames}
                  locale={locale}
                  onDelete={handleDelete}
                  onPin={handlePin}
                />
              );
            })}
          </ul>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="relative shrink-0 border-t border-white/[0.08] bg-surface-1/[0.6] p-2.5 sm:p-3"
      >
        {mention && suggestions.length > 0 && (
          <ul className="absolute bottom-full left-2 mb-1 w-64 max-w-[calc(100%-1rem)] overflow-hidden rounded-[10px] border border-white/[0.12] bg-abyss/95 shadow-2xl backdrop-blur-xl">
            {suggestions.map((s, idx) => (
              <li key={s.id}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectMention(s);
                  }}
                  onMouseEnter={() => setMentionIndex(idx)}
                  className={cn(
                    "flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm transition",
                    idx === mentionIndex
                      ? "bg-primary-500/[0.14] text-text-primary"
                      : "text-text-secondary hover:bg-white/[0.05]",
                  )}
                >
                  <UserAvatar
                    src={s.avatar_url}
                    name={s.display_name ?? s.username}
                    className="size-5 ring-1 ring-white/[0.1]"
                    fallbackClassName="bg-gradient-to-br from-primary-500/30 to-violet-500/30 text-[8px] font-bold text-text-primary"
                  />
                  <span className="truncate">@{s.username}</span>
                  {s.display_name && (
                    <span className="truncate text-xs text-text-tertiary">
                      {s.display_name}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-end gap-2 rounded-[10px] border border-white/[0.08] bg-abyss/40 p-1.5 focus-within:border-primary-500/40">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              const val = e.target.value;
              setInput(val);
              const caret = e.target.selectionStart ?? val.length;
              setMention(getMentionQuery(val, caret));
              setMentionIndex(0);
            }}
            onKeyDown={onKeyDown}
            maxLength={CHAT_MAX_LEN}
            rows={1}
            placeholder={
              fr
                ? "Écris dans le Salon…  (@ pour mentionner)"
                : "Write in the Lounge…  (@ to mention)"
            }
            className="max-h-32 min-h-[2.25rem] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-text-primary outline-none placeholder:text-text-tertiary"
          />
          <div className="flex items-center gap-2 pr-1">
            {input.length > CHAT_MAX_LEN - 40 && (
              <span
                className={cn(
                  "font-mono text-[10px] tabular-nums",
                  remaining < 0 ? "text-error" : "text-gold-400",
                )}
              >
                {remaining}
              </span>
            )}
            <button
              type="submit"
              disabled={isPending || input.trim().length === 0}
              aria-label={fr ? "Envoyer" : "Send"}
              className={cn(
                "inline-flex size-9 shrink-0 items-center justify-center rounded-[8px] transition",
                input.trim().length > 0 && !isPending
                  ? "bg-primary-500 text-abyss hover:bg-primary-400"
                  : "bg-white/[0.06] text-text-tertiary",
              )}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" strokeWidth={2} />
              ) : (
                <Send className="size-4" strokeWidth={2} />
              )}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

function MessageRow({
  message: m,
  grouped,
  canModerate,
  isAdmin,
  memberUsernames,
  locale,
  onDelete,
  onPin,
}: {
  message: ChatMessage;
  grouped: boolean;
  canModerate: boolean;
  isAdmin: boolean;
  memberUsernames: Set<string>;
  locale: Locale;
  onDelete: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
}) {
  const fr = locale === "fr";
  const name = m.author.display_name ?? `@${m.author.username}`;
  return (
    <li
      className={cn(
        "group relative flex gap-2.5 rounded-lg px-2 transition hover:bg-white/[0.025]",
        grouped ? "py-0.5" : "mt-2 pt-1.5 first:mt-0",
        m.pinned_at && "bg-gold-500/[0.04]",
      )}
    >
      <div className="w-8 shrink-0">
        {!grouped && (
          <Link href={`/u/${m.author.username}`}>
            <UserAvatar
              src={m.author.avatar_url}
              name={name}
              className="size-8 ring-1 ring-white/[0.1]"
              fallbackClassName="bg-gradient-to-br from-primary-500/30 to-violet-500/30 font-mono text-[11px] font-bold text-text-primary"
            />
          </Link>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {!grouped && (
          <div className="flex items-center gap-2">
            <Link
              href={`/u/${m.author.username}`}
              className="text-xs font-semibold text-text-primary transition hover:text-primary-300 hover:underline"
            >
              {name}
            </Link>
            <span className="font-mono text-[10px] tabular-nums text-text-tertiary">
              {formatTime(m.created_at, locale)}
            </span>
            {m.pinned_at && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-gold-300">
                <Pin className="size-2.5" strokeWidth={2.5} />
                {fr ? "Épinglé" : "Pinned"}
              </span>
            )}
          </div>
        )}

        <MessageBody body={m.body} memberUsernames={memberUsernames} locale={locale} />

        <div className="mt-0.5">
          <MessageReactions messageId={m.id} initial={m.reactions} />
        </div>
      </div>

      <div className="absolute right-1.5 top-1 flex items-center gap-0.5 rounded-md border border-white/[0.08] bg-abyss/80 opacity-0 shadow-sm backdrop-blur transition group-hover:opacity-100 focus-within:opacity-100">
        {isAdmin && (
          <button
            type="button"
            onClick={() => onPin(m.id, !m.pinned_at)}
            aria-label={
              m.pinned_at
                ? fr
                  ? "Désépingler"
                  : "Unpin"
                : fr
                  ? "Épingler"
                  : "Pin"
            }
            className="flex size-6 items-center justify-center text-text-tertiary transition hover:text-gold-300"
          >
            {m.pinned_at ? (
              <PinOff className="size-3.5" strokeWidth={1.7} />
            ) : (
              <Pin className="size-3.5" strokeWidth={1.7} />
            )}
          </button>
        )}
        {canModerate && (
          <button
            type="button"
            onClick={() => onDelete(m.id)}
            aria-label={fr ? "Supprimer" : "Delete"}
            className="flex size-6 items-center justify-center text-text-tertiary transition hover:text-error"
          >
            <Trash2 className="size-3.5" strokeWidth={1.7} />
          </button>
        )}
      </div>
    </li>
  );
}

function MessageReactions({
  messageId,
  initial,
}: {
  messageId: string;
  initial: ReactionSummary;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="flex items-center gap-1">
      <ReactionBar
        targetType="comment"
        targetId={messageId}
        initialCounts={initial.counts}
        initialMine={initial.mine}
        size={expanded ? "md" : "sm"}
      />
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-label="React"
        className={cn(
          "flex size-6 items-center justify-center rounded-full text-text-tertiary transition hover:bg-white/[0.06] hover:text-text-secondary",
          expanded && "bg-white/[0.06] text-text-secondary",
        )}
      >
        <Smile className="size-3.5" strokeWidth={1.7} />
      </button>
    </div>
  );
}
