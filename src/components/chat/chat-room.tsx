"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Link } from "@/i18n/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import {
  postChatMessage,
  deleteChatMessage,
  setChatPin,
} from "@/lib/chat/actions";
import { CHAT_MAX_LEN } from "@/lib/chat/constants";
import { markChatRead } from "./chat-unread";
import type { ChatMember, ChatMessage } from "@/lib/chat/queries";
import type { ReactionSummary } from "@/lib/social/queries";
import { ReactionBar } from "@/components/social/reaction-bar";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useToast } from "@/components/ui/toast-provider";
import { MessageBody } from "./message-body";
import { cn } from "@/lib/utils";
import { ArrowDown, Loader2, Pin, PinOff, Send, Smile, Trash2 } from "lucide-react";
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

type OnlineUser = { user_id: string; username: string; avatar_url: string | null };

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
  return d.toLocaleTimeString(locale === "fr" ? "fr-CA" : "en-CA", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dayKey(iso: string): string {
  return new Date(iso).toDateString();
}

function formatDay(iso: string, locale: Locale): string {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString())
    return locale === "fr" ? "Aujourd'hui" : "Today";
  if (d.toDateString() === yest.toDateString())
    return locale === "fr" ? "Hier" : "Yesterday";
  return d.toLocaleDateString(locale === "fr" ? "fr-CA" : "en-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
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

  // Realtime side-channels
  const [online, setOnline] = useState<OnlineUser[]>([]);
  const [typers, setTypers] = useState<Record<string, string>>({});
  const [connected, setConnected] = useState(false);

  // Scroll state
  const [atBottom, setAtBottom] = useState(true);
  const [unseen, setUnseen] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const stickRef = useRef(true);
  const lastTypingSentRef = useRef(0);
  const typingTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const me = useMemo(
    () => members.find((m) => m.id === currentUserId) ?? null,
    [members, currentUserId],
  );
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

  // --- Realtime: messages, pins, deletes, presence, typing ------------------
  useEffect(() => {
    markChatRead();
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
      .channel("chat:global", {
        config: { presence: { key: currentUserId } },
      })
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
          markChatRead();
          setMessages((prev) =>
            prev.some((m) => m.id === row.id) ? prev : [...prev, rowToMessage(row)],
          );
          if (row.user_id !== currentUserId && !stickRef.current) {
            setUnseen((u) => u + 1);
          }
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
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const p = payload as { user_id?: string; username?: string };
        if (!p?.user_id || p.user_id === currentUserId) return;
        const uid = p.user_id;
        setTypers((prev) => ({ ...prev, [uid]: p.username ?? "?" }));
        const tos = typingTimeouts.current;
        const existing = tos.get(uid);
        if (existing) clearTimeout(existing);
        tos.set(
          uid,
          setTimeout(() => {
            setTypers((prev) => {
              const next = { ...prev };
              delete next[uid];
              return next;
            });
            tos.delete(uid);
          }, 4000),
        );
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<
          string,
          Array<{ user_id?: string; username?: string; avatar_url?: string | null }>
        >;
        const seen = new Map<string, OnlineUser>();
        for (const key of Object.keys(state)) {
          for (const meta of state[key]) {
            if (meta.user_id) {
              seen.set(meta.user_id, {
                user_id: meta.user_id,
                username: meta.username ?? "?",
                avatar_url: meta.avatar_url ?? null,
              });
            }
          }
        }
        setOnline(Array.from(seen.values()));
      })
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") {
          const meMeta = membersByIdRef.current.get(currentUserId);
          void channel.track({
            user_id: currentUserId,
            username: meMeta?.username ?? "?",
            avatar_url: meMeta?.avatar_url ?? null,
          });
        }
      });

    channelRef.current = channel;
    const timeouts = typingTimeouts.current;
    return () => {
      channelRef.current = null;
      for (const t of timeouts.values()) clearTimeout(t);
      timeouts.clear();
      void supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  // --- Auto-scroll ----------------------------------------------------------
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    stickRef.current = near;
    setAtBottom(near);
    if (near && unseen) setUnseen(0);
  }

  function scrollToBottom() {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    stickRef.current = true;
    setAtBottom(true);
    setUnseen(0);
  }

  // --- Compose --------------------------------------------------------------
  function autosize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }

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
      requestAnimationFrame(autosize);
      const row = res.message;
      stickRef.current = true;
      setAtBottom(true);
      setUnseen(0);
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

  function sendTyping() {
    const now = Date.now();
    if (!channelRef.current || !me || now - lastTypingSentRef.current < 1500)
      return;
    lastTypingSentRef.current = now;
    void channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: currentUserId, username: me.username },
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
        autosize();
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

  const typingNames = Object.entries(typers)
    .filter(([uid]) => uid !== currentUserId)
    .map(([, name]) => name);
  const remaining = CHAT_MAX_LEN - input.length;
  const onlineCount = online.length;

  return (
    <section className="relative flex h-[70vh] min-h-[480px] max-h-[880px] flex-col overflow-hidden rounded-[16px] border border-white/[0.08] bg-surface-1/[0.5] shadow-card backdrop-blur-xl">
      {/* Header strip: live status + online presence */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.08] bg-abyss/30 px-3 py-2 sm:px-4">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-text-tertiary">
          <span
            className={cn(
              "size-1.5 rounded-full",
              connected ? "bg-primary-400 animate-pulse" : "bg-text-tertiary/50",
            )}
          />
          {connected
            ? fr
              ? "En direct"
              : "Live"
            : fr
              ? "Reconnexion…"
              : "Reconnecting…"}
        </span>
        {onlineCount > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {online.slice(0, 5).map((u) => (
                <UserAvatar
                  key={u.user_id}
                  src={u.avatar_url}
                  name={u.username}
                  className="size-6 ring-2 ring-surface-1"
                  fallbackClassName="bg-gradient-to-br from-primary-500/40 to-violet-500/40 text-[9px] font-bold text-text-primary"
                />
              ))}
            </div>
            <span className="text-[11px] font-medium text-text-secondary">
              {onlineCount} {fr ? "en ligne" : "online"}
            </span>
          </div>
        )}
      </div>

      {/* Pinned messages */}
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

      {/* Feed */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 space-y-0.5 overflow-y-auto px-2 py-4 sm:px-3"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-primary-500/10 text-primary-300 ring-1 ring-primary-500/25">
              <Send className="size-5" strokeWidth={1.6} />
            </span>
            <p className="text-sm font-medium text-text-secondary">
              {fr ? "Le Salon est tout neuf" : "The Lounge is brand new"}
            </p>
            <p className="max-w-xs text-xs text-text-tertiary">
              {fr
                ? "Lance la discussion : un pronostic osé, une vanne, un débat d'avant-match ⚽"
                : "Start it off: a bold prediction, some banter, a pre-match debate ⚽"}
            </p>
          </div>
        ) : (
          <ul>
            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const newDay = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
              const grouped =
                !!prev &&
                !newDay &&
                prev.user_id === m.user_id &&
                !m.pinned_at &&
                new Date(m.created_at).getTime() -
                  new Date(prev.created_at).getTime() <
                  5 * 60_000;
              return (
                <div key={m.id}>
                  {newDay && (
                    <div className="my-3 flex items-center gap-3 px-2">
                      <span className="h-px flex-1 bg-white/[0.07]" />
                      <span className="rounded-full bg-white/[0.05] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                        {formatDay(m.created_at, locale)}
                      </span>
                      <span className="h-px flex-1 bg-white/[0.07]" />
                    </div>
                  )}
                  <MessageRow
                    message={m}
                    grouped={grouped}
                    isMine={m.user_id === currentUserId}
                    canModerate={isAdmin || m.user_id === currentUserId}
                    isAdmin={isAdmin}
                    memberUsernames={memberUsernames}
                    locale={locale}
                    onDelete={handleDelete}
                    onPin={handlePin}
                  />
                </div>
              );
            })}
          </ul>
        )}
      </div>

      {/* Scroll-to-bottom / new messages */}
      {!atBottom && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-24 right-4 z-10 flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-abyss/90 px-3 py-1.5 text-xs font-semibold text-text-primary shadow-lg backdrop-blur transition hover:border-primary-500/40 hover:text-primary-300"
        >
          {unseen > 0 && (
            <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary-500 px-1 font-mono text-[9px] font-bold text-abyss">
              {unseen > 99 ? "99+" : unseen}
            </span>
          )}
          {unseen > 0
            ? fr
              ? "Nouveaux messages"
              : "New messages"
            : fr
              ? "En bas"
              : "Latest"}
          <ArrowDown className="size-3.5" strokeWidth={2} />
        </button>
      )}

      {/* Typing indicator */}
      {typingNames.length > 0 && (
        <div className="shrink-0 px-4 pb-1 pt-0.5 text-[11px] italic text-text-tertiary">
          <span className="inline-flex items-center gap-1">
            <TypingDots />
            {typingNames.length === 1
              ? fr
                ? `${typingNames[0]} écrit…`
                : `${typingNames[0]} is typing…`
              : typingNames.length === 2
                ? fr
                  ? `${typingNames[0]} et ${typingNames[1]} écrivent…`
                  : `${typingNames[0]} and ${typingNames[1]} are typing…`
                : fr
                  ? "Plusieurs personnes écrivent…"
                  : "Several people are typing…"}
          </span>
        </div>
      )}

      {/* Compose */}
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

        <div className="flex items-end gap-2 rounded-[12px] border border-white/[0.08] bg-abyss/40 p-1.5 transition focus-within:border-primary-500/40">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              const val = e.target.value;
              setInput(val);
              const caret = e.target.selectionStart ?? val.length;
              setMention(getMentionQuery(val, caret));
              setMentionIndex(0);
              autosize();
              if (val.trim()) sendTyping();
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
                "inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] transition",
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

function TypingDots() {
  return (
    <span className="inline-flex gap-0.5">
      <span className="size-1 animate-bounce rounded-full bg-text-tertiary [animation-delay:-0.3s]" />
      <span className="size-1 animate-bounce rounded-full bg-text-tertiary [animation-delay:-0.15s]" />
      <span className="size-1 animate-bounce rounded-full bg-text-tertiary" />
    </span>
  );
}

function MessageRow({
  message: m,
  grouped,
  isMine,
  canModerate,
  isAdmin,
  memberUsernames,
  locale,
  onDelete,
  onPin,
}: {
  message: ChatMessage;
  grouped: boolean;
  isMine: boolean;
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
        m.pinned_at && "bg-gold-500/[0.05]",
        isMine && !m.pinned_at && "bg-primary-500/[0.04]",
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
            {isMine && (
              <span className="rounded-full bg-primary-500/15 px-1.5 text-[9px] font-bold uppercase tracking-wide text-primary-300">
                {fr ? "toi" : "you"}
              </span>
            )}
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
