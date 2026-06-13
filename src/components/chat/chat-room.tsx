"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Link } from "@/i18n/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import {
  postChatMessage,
  deleteChatMessage,
  setChatPin,
  setChatMute,
  reportChatMessage,
  voteChatPoll,
} from "@/lib/chat/actions";
import {
  CHAT_MAX_LEN,
  CHAT_MEDIA_BUCKET,
  CHAT_IMAGE_MAX_BYTES,
  CHAT_BOT_USER_ID,
} from "@/lib/chat/constants";
import { markChatRead } from "./chat-unread";
import type {
  ChatMember,
  ChatMessage,
  ChatMute,
  ChatPoll,
  ChatReplyPreview,
} from "@/lib/chat/queries";
import type { ReactionSummary } from "@/lib/social/queries";
import { ReactionBar } from "@/components/social/reaction-bar";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useToast } from "@/components/ui/toast-provider";
import { MessageBody } from "./message-body";
import { PollCard } from "./poll-card";
import { PollComposer } from "./poll-composer";
import { BetCard } from "./bet-card";
import { LiveMatchBar } from "./live-match-bar";
import type { ChatLiveMatch } from "@/lib/chat/queries";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  BarChart3,
  Flag,
  ImagePlus,
  Loader2,
  MicOff,
  Pin,
  PinOff,
  Reply,
  Send,
  Shield,
  Smile,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import type { Locale } from "@/i18n/routing";

type Props = {
  initialMessages: ChatMessage[];
  members: ChatMember[];
  initialMutes: ChatMute[];
  initialLiveMatches: ChatLiveMatch[];
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
  reply_to_id: string | null;
  image_url: string | null;
  deleted_at: string | null;
};

type OnlineUser = { user_id: string; username: string; avatar_url: string | null };

const EMPTY_REACTIONS: ReactionSummary = {
  counts: { fire: 0, clap: 0, laugh: 0, think: 0, shock: 0, skull: 0 },
  mine: [],
};

const EMOJIS = [
  "⚽", "🔥", "😂", "😮", "😢", "👏", "🙌", "💪",
  "🎉", "😅", "🤝", "👀", "🥅", "🟥", "🟨", "🐐",
  "💀", "🤔", "❤️", "👍", "👎", "🙏", "😱", "🤣",
];

function isAdminRole(role: string): boolean {
  return role === "admin" || role === "super_admin";
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");
}

/** Apply one vote to a poll's counts (prev = the voter's previous choice). */
function bumpPoll(
  poll: ChatPoll,
  idx: number,
  prev: number | null,
  isSelf: boolean,
): ChatPoll {
  const counts = [...poll.counts];
  if (prev !== null && prev >= 0 && prev < counts.length) {
    counts[prev] = Math.max(0, counts[prev] - 1);
  }
  if (idx >= 0 && idx < counts.length) counts[idx] += 1;
  return {
    ...poll,
    counts,
    total: prev === null ? poll.total + 1 : poll.total,
    my_vote: isSelf ? idx : poll.my_vote,
  };
}

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
  return new Date(iso).toLocaleTimeString(locale === "fr" ? "fr-CA" : "en-CA", {
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
  initialMutes,
  initialLiveMatches,
  currentUserId,
  isAdmin,
  locale,
}: Props) {
  const fr = locale === "fr";
  const toast = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();

  // Watch party
  const [liveMatches, setLiveMatches] = useState<ChatLiveMatch[]>(initialLiveMatches);
  const [floats, setFloats] = useState<{ id: string; emoji: string; left: number }[]>([]);
  const floatCounter = useRef(0);

  const pushFloat = useCallback((emoji: string) => {
    const id = crypto.randomUUID();
    const left = 8 + ((floatCounter.current * 23) % 74);
    floatCounter.current += 1;
    setFloats((f) => [...f, { id, emoji, left }]);
    setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 2700);
  }, []);

  // Moderation + composing extras
  const [mutedIds, setMutedIds] = useState<Set<string>>(
    () => new Set(initialMutes.map((m) => m.user_id)),
  );
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState<{
    url: string;
    uploading: boolean;
  } | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [pollOpen, setPollOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Realtime side-channels
  const [online, setOnline] = useState<OnlineUser[]>([]);
  const [typers, setTypers] = useState<Record<string, string>>({});
  const [connected, setConnected] = useState(false);
  const [flashIds, setFlashIds] = useState<Set<string>>(() => new Set());

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
  // Messages present at first render don't animate in; later arrivals do.
  const [initialIds] = useState<Set<string>>(
    () => new Set(initialMessages.map((m) => m.id)),
  );

  const amIMuted = mutedIds.has(currentUserId);
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
  const membersById = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members],
  );
  const onlineIds = useMemo(
    () => new Set(online.map((u) => u.user_id)),
    [online],
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

    function rowToMessage(row: ChatRow, reply: ChatReplyPreview | null): ChatMessage {
      const a = membersByIdRef.current.get(row.user_id);
      return {
        id: row.id,
        user_id: row.user_id,
        body: row.body,
        created_at: row.created_at,
        pinned_at: row.pinned_at ?? null,
        reply_to_id: row.reply_to_id ?? null,
        reply,
        image_url: row.image_url ?? null,
        poll: null,
        bet_card: null,
        author: a
          ? {
              username: a.username,
              display_name: a.display_name,
              avatar_url: a.avatar_url,
              role: a.role,
            }
          : { username: "…", display_name: null, avatar_url: null, role: "player" },
        reactions: { counts: { ...EMPTY_REACTIONS.counts }, mine: [] },
      };
    }

    async function resolveAuthor(userId: string) {
      if (membersByIdRef.current.has(userId)) return;
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, role")
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
                  role: data.role,
                },
              }
            : m,
        ),
      );
    }

    function flash(id: string) {
      setFlashIds((prev) => new Set(prev).add(id));
      setTimeout(() => {
        setFlashIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 2800);
    }

    // A new message might carry a poll — fetch it and attach (cheap unique lookup).
    async function enrichPoll(commentId: string) {
      const { data } = await supabase
        .from("chat_polls")
        .select("id, question, options, closes_at")
        .eq("comment_id", commentId)
        .maybeSingle();
      if (!data) return;
      const opts = (data.options as string[]) ?? [];
      setMessages((prev) =>
        prev.map((m) =>
          m.id === commentId
            ? {
                ...m,
                poll: {
                  id: data.id,
                  question: data.question,
                  options: opts,
                  counts: new Array(opts.length).fill(0),
                  total: 0,
                  my_vote: null,
                  closes_at: data.closes_at,
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
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            const parent = row.reply_to_id
              ? prev.find((m) => m.id === row.reply_to_id)
              : null;
            const reply = parent
              ? { author: parent.author.username, body: parent.body }
              : null;
            // Flash if this new message mentions or replies to me.
            if (row.user_id !== currentUserId) {
              const myName = membersByIdRef.current.get(currentUserId)?.username;
              const mentionsMe =
                myName &&
                new RegExp(`@${escapeRegex(myName)}(?![A-Za-z0-9_-])`, "i").test(
                  row.body,
                );
              const repliesToMe = parent?.user_id === currentUserId;
              if (mentionsMe || repliesToMe) flash(row.id);
            }
            return [...prev, rowToMessage(row, reply)];
          });
          if (row.user_id !== currentUserId && !stickRef.current) {
            setUnseen((u) => u + 1);
          }
          if (!membersByIdRef.current.has(row.user_id)) void resolveAuthor(row.user_id);
          void enrichPoll(row.id);
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
      .on("broadcast", { event: "poll_vote" }, ({ payload }) => {
        const p = payload as { pollId?: string; idx?: number; prev?: number | null };
        if (!p?.pollId || typeof p.idx !== "number") return;
        setMessages((prev) =>
          prev.map((m) =>
            m.poll && m.poll.id === p.pollId
              ? { ...m, poll: bumpPoll(m.poll, p.idx!, p.prev ?? null, false) }
              : m,
          ),
        );
      })
      .on("broadcast", { event: "reaction" }, ({ payload }) => {
        const e = (payload as { emoji?: string })?.emoji;
        if (e) pushFloat(e);
      })
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "ref", table: "matches" },
        (payload) => {
          const r = payload.new as {
            id: string;
            home_score: number | null;
            away_score: number | null;
            status: string;
          };
          setLiveMatches((prev) =>
            r.status !== "live"
              ? prev.filter((m) => m.id !== r.id)
              : prev.map((m) =>
                  m.id === r.id
                    ? { ...m, home_score: r.home_score, away_score: r.away_score }
                    : m,
                ),
          );
        },
      )
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
  }, [currentUserId, pushFloat]);

  // --- Auto-scroll ----------------------------------------------------------
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Close the image lightbox on Escape.
  useEffect(() => {
    if (!lightbox) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(null);
    }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [lightbox]);

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

  function insertAtCaret(text: string) {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? input.length;
    const end = el?.selectionEnd ?? start;
    const next = input.slice(0, start) + text + input.slice(end);
    setInput(next);
    const pos = start + text.length;
    requestAnimationFrame(() => {
      if (el) {
        el.focus();
        el.setSelectionRange(pos, pos);
        autosize();
      }
    });
  }

  async function uploadImage(file: File) {
    if (amIMuted) return;
    if (!file.type.startsWith("image/")) {
      toast.error(fr ? "Choisis une image." : "Pick an image.");
      return;
    }
    if (file.size > CHAT_IMAGE_MAX_BYTES) {
      toast.error(fr ? "Image trop lourde (max 8 Mo)." : "Image too large (max 8 MB).");
      return;
    }
    setPendingImage({ url: "", uploading: true });
    try {
      const supabase = getSupabaseBrowser();
      const ext =
        (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") ||
        "png";
      const path = `${currentUserId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from(CHAT_MEDIA_BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from(CHAT_MEDIA_BUCKET).getPublicUrl(path);
      setPendingImage({ url: data.publicUrl, uploading: false });
      requestAnimationFrame(() => textareaRef.current?.focus());
    } catch (e) {
      setPendingImage(null);
      toast.error((e as Error).message || (fr ? "Échec de l'envoi de l'image." : "Image upload failed."));
    }
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void uploadImage(file);
  }

  function onPasteCompose(e: React.ClipboardEvent) {
    const item = Array.from(e.clipboardData.items).find((i) =>
      i.type.startsWith("image/"),
    );
    const file = item?.getAsFile();
    if (file) {
      e.preventDefault();
      void uploadImage(file);
    }
  }

  function onDropCompose(e: React.DragEvent) {
    const file = Array.from(e.dataTransfer.files).find((f) =>
      f.type.startsWith("image/"),
    );
    if (file) {
      e.preventDefault();
      void uploadImage(file);
    }
  }

  function submit() {
    const text = input.trim();
    const image = pendingImage?.uploading ? null : pendingImage?.url ?? null;
    if ((!text && !image) || isPending || amIMuted || pendingImage?.uploading) return;
    const reply = replyingTo;
    startTransition(async () => {
      const res = await postChatMessage(text, locale, reply?.id ?? null, image);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      setInput("");
      setMention(null);
      setReplyingTo(null);
      setEmojiOpen(false);
      setPendingImage(null);
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
                reply_to_id: row.reply_to_id,
                reply: reply
                  ? { author: reply.author.username, body: reply.body }
                  : null,
                image_url: row.image_url,
                poll: null,
                bet_card: null,
                author: me
                  ? {
                      username: me.username,
                      display_name: me.display_name,
                      avatar_url: me.avatar_url,
                      role: me.role,
                    }
                  : { username: "…", display_name: null, avatar_url: null, role: "player" },
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

  function handleMute(userId: string, mute: boolean, username: string) {
    startTransition(async () => {
      const res = await setChatMute(userId, mute, locale);
      if (res.ok) {
        setMutedIds((prev) => {
          const next = new Set(prev);
          if (mute) next.add(userId);
          else next.delete(userId);
          return next;
        });
        toast.success(
          mute
            ? fr
              ? `@${username} ne peut plus écrire.`
              : `@${username} can no longer post.`
            : fr
              ? `@${username} peut de nouveau écrire.`
              : `@${username} can post again.`,
        );
      } else {
        toast.error(res.message ?? "");
      }
    });
  }

  function handleReport(id: string) {
    startTransition(async () => {
      const res = await reportChatMessage(id, locale);
      if (res.ok)
        toast.success(fr ? "Message signalé aux admins." : "Reported to the admins.");
      else toast.error(res.message ?? "");
    });
  }

  function handleVote(pollId: string, idx: number) {
    const msg = messages.find((m) => m.poll?.id === pollId);
    const prev = msg?.poll?.my_vote ?? null;
    if (prev === idx) return; // already this choice
    setMessages((ms) =>
      ms.map((m) =>
        m.poll && m.poll.id === pollId
          ? { ...m, poll: bumpPoll(m.poll, idx, prev, true) }
          : m,
      ),
    );
    startTransition(async () => {
      const res = await voteChatPoll(pollId, idx, locale);
      if (!res.ok) {
        toast.error(res.message ?? "");
        return;
      }
      channelRef.current?.send({
        type: "broadcast",
        event: "poll_vote",
        payload: { pollId, idx, prev },
      });
    });
  }

  function handleReact(emoji: string) {
    pushFloat(emoji);
    channelRef.current?.send({
      type: "broadcast",
      event: "reaction",
      payload: { emoji },
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
    if (e.key === "Escape" && replyingTo) {
      e.preventDefault();
      setReplyingTo(null);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function startReply(m: ChatMessage) {
    setReplyingTo(m);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  const pinned = useMemo(
    () =>
      messages
        .filter((m) => m.pinned_at)
        .sort((a, b) => (a.pinned_at! < b.pinned_at! ? 1 : -1)),
    [messages],
  );

  const typingList = Object.keys(typers)
    .filter((uid) => uid !== currentUserId)
    .map((uid) => {
      const mem = membersById.get(uid);
      return {
        id: uid,
        username: typers[uid] ?? mem?.username ?? "?",
        avatar_url: mem?.avatar_url ?? null,
      };
    });
  const remaining = CHAT_MAX_LEN - input.length;
  const onlineCount = online.length;

  return (
    <section className="relative flex h-[calc(100dvh-14rem)] min-h-[20rem] max-h-[880px] flex-col overflow-hidden rounded-[16px] border border-white/[0.08] bg-surface-1/[0.5] shadow-card backdrop-blur-xl sm:h-[70dvh] sm:min-h-[480px]">
      {/* Animated accent line */}
      <div className="lk-gradient-pan h-[2px] w-full shrink-0 bg-[linear-gradient(90deg,transparent,rgba(34,217,130,0.55),rgba(124,92,255,0.55),transparent)]" />

      {/* Watch party — live scores + one-tap reactions */}
      <LiveMatchBar matches={liveMatches} locale={locale} onReact={handleReact} />

      {/* Header strip: live status + online presence */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.08] bg-abyss/30 px-3 py-2 sm:px-4">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-text-tertiary">
          <span className="relative flex size-2">
            {connected && (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary-400/70" />
            )}
            <span
              className={cn(
                "relative inline-flex size-2 rounded-full",
                connected ? "bg-primary-400" : "bg-text-tertiary/50",
              )}
            />
          </span>
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
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="lk-float flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/20 to-violet-500/20 text-3xl ring-1 ring-white/[0.1]">
              ⚽
            </span>
            <p className="text-sm font-medium text-text-secondary">
              {fr ? "Le Salon est tout neuf" : "The Lounge is brand new"}
            </p>
            <p className="max-w-xs text-xs text-text-tertiary">
              {fr
                ? "Lance la discussion : un pronostic osé, une vanne, un débat d'avant-match."
                : "Start it off: a bold prediction, some banter, a pre-match debate."}
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
                !m.reply_to_id &&
                new Date(m.created_at).getTime() -
                  new Date(prev.created_at).getTime() <
                  5 * 60_000;
              return (
                <div key={m.id}>
                  {newDay && (
                    <div className="sticky top-0 z-10 my-3 flex items-center justify-center">
                      <span className="rounded-full border border-white/[0.08] bg-abyss/85 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary shadow-sm backdrop-blur">
                        {formatDay(m.created_at, locale)}
                      </span>
                    </div>
                  )}
                  <MessageRow
                    message={m}
                    grouped={grouped}
                    isMine={m.user_id === currentUserId}
                    isAdmin={isAdmin}
                    isAuthorMuted={mutedIds.has(m.user_id)}
                    isOnline={onlineIds.has(m.user_id)}
                    animateIn={!initialIds.has(m.id)}
                    flashing={flashIds.has(m.id)}
                    myUsername={me?.username ?? null}
                    memberUsernames={memberUsernames}
                    locale={locale}
                    onReply={startReply}
                    onDelete={handleDelete}
                    onPin={handlePin}
                    onMute={handleMute}
                    onReport={handleReport}
                    onImageClick={setLightbox}
                    onVote={handleVote}
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
          className="lk-pop absolute bottom-28 right-4 z-10 flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-abyss/90 px-3 py-1.5 text-xs font-semibold text-text-primary shadow-lg backdrop-blur transition hover:border-primary-500/40 hover:text-primary-300"
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
      {typingList.length > 0 && (
        <div className="flex shrink-0 items-center gap-2 px-4 pb-1 pt-0.5 text-[11px] italic text-text-tertiary">
          <div className="flex -space-x-1.5">
            {typingList.slice(0, 3).map((t) => (
              <UserAvatar
                key={t.id}
                src={t.avatar_url}
                name={t.username}
                className="size-5 ring-2 ring-surface-1"
                fallbackClassName="bg-gradient-to-br from-primary-500/40 to-violet-500/40 text-[8px] font-bold text-text-primary"
              />
            ))}
          </div>
          <TypingDots />
          <span>
            {typingList.length === 1
              ? fr
                ? `${typingList[0].username} écrit…`
                : `${typingList[0].username} is typing…`
              : fr
                ? "plusieurs personnes écrivent…"
                : "several people are typing…"}
          </span>
        </div>
      )}

      {/* Compose */}
      <div className="relative shrink-0 border-t border-white/[0.08] bg-surface-1/[0.6] p-2.5 sm:p-3">
        {amIMuted ? (
          <div className="flex items-center gap-2 rounded-[10px] border border-error/30 bg-error/[0.08] px-3 py-2.5 text-xs text-error">
            <MicOff className="size-4 shrink-0" strokeWidth={1.8} />
            {fr
              ? "Un admin t'a rendu muet dans le Salon. Tu peux lire mais pas écrire."
              : "An admin muted you in the Lounge. You can read but not post."}
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            {replyingTo && (
              <div className="mb-1.5 flex items-center gap-2 rounded-[8px] border border-white/[0.08] bg-abyss/40 px-2.5 py-1.5 text-xs">
                <Reply className="size-3.5 shrink-0 text-primary-300" strokeWidth={2} />
                <span className="shrink-0 font-semibold text-text-secondary">
                  {fr ? "Réponse à" : "Replying to"} @{replyingTo.author.username}
                </span>
                <span className="min-w-0 flex-1 truncate text-text-tertiary">
                  {replyingTo.body}
                </span>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  aria-label={fr ? "Annuler" : "Cancel"}
                  className="shrink-0 text-text-tertiary transition hover:text-text-primary"
                >
                  <X className="size-3.5" strokeWidth={2} />
                </button>
              </div>
            )}

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

            {emojiOpen && (
              <div className="absolute bottom-full right-2 mb-1 grid grid-cols-8 gap-0.5 rounded-[10px] border border-white/[0.12] bg-abyss/95 p-1.5 shadow-2xl backdrop-blur-xl">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onMouseDown={(ev) => {
                      ev.preventDefault();
                      insertAtCaret(e);
                    }}
                    className="flex size-7 items-center justify-center rounded-md text-base transition hover:scale-110 hover:bg-white/[0.08]"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}

            {pendingImage && (
              <div className="mb-1.5 inline-flex items-center gap-2 rounded-[8px] border border-white/[0.08] bg-abyss/40 p-1.5">
                {pendingImage.uploading ? (
                  <div className="flex size-16 items-center justify-center rounded-md bg-white/[0.04]">
                    <Loader2 className="size-5 animate-spin text-text-tertiary" strokeWidth={2} />
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URL preview.
                  <img src={pendingImage.url} alt="" className="size-16 rounded-md object-cover" />
                )}
                <button
                  type="button"
                  onClick={() => setPendingImage(null)}
                  aria-label={fr ? "Retirer l'image" : "Remove image"}
                  className="flex size-6 items-center justify-center rounded-full bg-abyss/80 text-text-secondary transition hover:text-error"
                >
                  <X className="size-3.5" strokeWidth={2} />
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onPickFile}
              className="hidden"
            />

            <div
              onDrop={onDropCompose}
              onDragOver={(e) => e.preventDefault()}
              className="flex items-end gap-1.5 rounded-[12px] border border-white/[0.08] bg-abyss/40 p-1.5 transition focus-within:border-primary-500/40"
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label={fr ? "Joindre une image" : "Attach an image"}
                className="flex size-9 shrink-0 items-center justify-center rounded-[10px] text-text-tertiary transition hover:bg-white/[0.06] hover:text-primary-300"
              >
                <ImagePlus className="size-5" strokeWidth={1.7} />
              </button>
              <button
                type="button"
                onClick={() => setEmojiOpen((v) => !v)}
                aria-label={fr ? "Emojis" : "Emojis"}
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-[10px] text-text-tertiary transition hover:bg-white/[0.06] hover:text-primary-300",
                  emojiOpen && "bg-white/[0.06] text-primary-300",
                )}
              >
                <Smile className="size-5" strokeWidth={1.7} />
              </button>
              <button
                type="button"
                onClick={() => setPollOpen(true)}
                aria-label={fr ? "Créer un sondage" : "Create a poll"}
                className="flex size-9 shrink-0 items-center justify-center rounded-[10px] text-text-tertiary transition hover:bg-white/[0.06] hover:text-violet-300"
              >
                <BarChart3 className="size-5" strokeWidth={1.7} />
              </button>
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
                onPaste={onPasteCompose}
                maxLength={CHAT_MAX_LEN}
                rows={1}
                placeholder={
                  fr
                    ? "Écris dans le Salon…  (@ pour mentionner)"
                    : "Write in the Lounge…  (@ to mention)"
                }
                className="max-h-32 min-h-[2.25rem] flex-1 resize-none bg-transparent px-2 py-1.5 text-base text-text-primary outline-none placeholder:text-text-tertiary sm:text-sm"
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
                  disabled={
                    isPending ||
                    pendingImage?.uploading ||
                    (input.trim().length === 0 && !pendingImage)
                  }
                  aria-label={fr ? "Envoyer" : "Send"}
                  className={cn(
                    "inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] transition active:scale-95",
                    (input.trim().length > 0 || (pendingImage && !pendingImage.uploading)) &&
                      !isPending
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
        )}
      </div>

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-abyss/90 p-4 backdrop-blur-sm"
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label={fr ? "Fermer" : "Close"}
            className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full border border-white/[0.12] bg-abyss/80 text-text-secondary transition hover:text-text-primary"
          >
            <X className="size-5" strokeWidth={2} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URL. */}
          <img
            src={lightbox}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[92vw] rounded-[12px] object-contain shadow-2xl"
          />
        </div>
      )}

      {pollOpen && <PollComposer locale={locale} onClose={() => setPollOpen(false)} />}

      {/* Floating watch-party reactions */}
      {floats.length > 0 && (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
          {floats.map((f) => (
            <span
              key={f.id}
              className="lk-float-up absolute bottom-24 text-3xl"
              style={{ left: `${f.left}%` }}
            >
              {f.emoji}
            </span>
          ))}
        </div>
      )}
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
  isAdmin,
  isAuthorMuted,
  isOnline,
  animateIn,
  flashing,
  myUsername,
  memberUsernames,
  locale,
  onReply,
  onDelete,
  onPin,
  onMute,
  onReport,
  onImageClick,
  onVote,
}: {
  message: ChatMessage;
  grouped: boolean;
  isMine: boolean;
  isAdmin: boolean;
  isAuthorMuted: boolean;
  isOnline: boolean;
  animateIn: boolean;
  flashing: boolean;
  myUsername: string | null;
  memberUsernames: Set<string>;
  locale: Locale;
  onReply: (m: ChatMessage) => void;
  onDelete: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onMute: (userId: string, mute: boolean, username: string) => void;
  onReport: (id: string) => void;
  onImageClick: (url: string) => void;
  onVote: (pollId: string, idx: number) => void;
}) {
  const fr = locale === "fr";
  const isBot = m.user_id === CHAT_BOT_USER_ID;
  const name = isBot ? "Salon" : m.author.display_name ?? `@${m.author.username}`;
  const authorIsAdmin = isAdminRole(m.author.role);
  const canMute = isAdmin && !isMine && !isBot;
  return (
    <li
      className={cn(
        "group relative flex gap-2.5 rounded-lg px-2 transition hover:bg-white/[0.025]",
        grouped ? "py-0.5" : "mt-2 pt-1.5 first:mt-0",
        m.pinned_at && "bg-gold-500/[0.05]",
        isMine && !m.pinned_at && "bg-primary-500/[0.04]",
        animateIn && "lk-msg-in",
        flashing && "lk-mention-flash",
      )}
    >
      <div className="w-8 shrink-0">
        {!grouped &&
          (isBot ? (
            <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-500/30 to-violet-500/30 text-base ring-1 ring-white/[0.1]">
              🤖
            </span>
          ) : (
            <Link href={`/u/${m.author.username}`} className="relative block">
              <UserAvatar
                src={m.author.avatar_url}
                name={name}
                className="size-8 ring-1 ring-white/[0.1]"
                fallbackClassName="bg-gradient-to-br from-primary-500/30 to-violet-500/30 font-mono text-[11px] font-bold text-text-primary"
              />
              {isOnline && (
                <span className="absolute -bottom-0.5 -right-0.5 flex size-2.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary-400/70" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-primary-400 ring-2 ring-surface-1" />
                </span>
              )}
            </Link>
          ))}
      </div>

      <div className="min-w-0 flex-1">
        {!grouped && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {isBot ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-text-primary">
                {name}
                <span className="rounded-full bg-violet-500/15 px-1.5 text-[9px] font-bold uppercase tracking-wide text-violet-300">
                  bot
                </span>
              </span>
            ) : (
              <Link
                href={`/u/${m.author.username}`}
                className="text-xs font-semibold text-text-primary transition hover:text-primary-300 hover:underline"
              >
                {name}
              </Link>
            )}
            {!isBot && authorIsAdmin && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-500/15 px-1.5 text-[9px] font-bold uppercase tracking-wide text-violet-300">
                <Shield className="size-2.5" strokeWidth={2.5} />
                admin
              </span>
            )}
            {isMine && (
              <span className="rounded-full bg-primary-500/15 px-1.5 text-[9px] font-bold uppercase tracking-wide text-primary-300">
                {fr ? "toi" : "you"}
              </span>
            )}
            {isAuthorMuted && isAdmin && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-error/15 px-1.5 text-[9px] font-bold uppercase tracking-wide text-error">
                <MicOff className="size-2.5" strokeWidth={2.5} />
                {fr ? "muet" : "muted"}
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

        {m.reply && (
          <div className="mb-1 mt-0.5 flex items-center gap-1.5 border-l-2 border-primary-500/40 pl-2 text-[11px] text-text-tertiary">
            <Reply className="size-3 shrink-0" strokeWidth={2} />
            <span className="font-semibold text-text-secondary">
              @{m.reply.author}
            </span>
            <span className="min-w-0 truncate">{m.reply.body}</span>
          </div>
        )}

        {m.body && (
          <MessageBody
            body={m.body}
            memberUsernames={memberUsernames}
            locale={locale}
            highlightUsername={myUsername}
          />
        )}

        {m.image_url && (
          <button
            type="button"
            onClick={() => onImageClick(m.image_url!)}
            className="mt-1 block overflow-hidden rounded-[10px] border border-white/[0.08] transition hover:border-primary-500/40"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URL. */}
            <img
              src={m.image_url}
              alt={fr ? "Image partagée" : "Shared image"}
              loading="lazy"
              className="max-h-72 max-w-full object-cover"
            />
          </button>
        )}

        {m.poll && <PollCard poll={m.poll} locale={locale} onVote={onVote} />}

        {m.bet_card && <BetCard pred={m.bet_card} locale={locale} />}

        <div className="mt-0.5">
          <MessageReactions messageId={m.id} initial={m.reactions} />
        </div>
      </div>

      <div className="absolute right-1.5 top-1 flex items-center gap-0.5 rounded-md border border-white/[0.08] bg-abyss/80 opacity-0 shadow-sm backdrop-blur transition group-hover:opacity-100 focus-within:opacity-100">
        <button
          type="button"
          onClick={() => onReply(m)}
          aria-label={fr ? "Répondre" : "Reply"}
          className="flex size-6 items-center justify-center text-text-tertiary transition hover:text-primary-300"
        >
          <Reply className="size-3.5" strokeWidth={1.7} />
        </button>
        {!isMine && (
          <button
            type="button"
            onClick={() => onReport(m.id)}
            aria-label={fr ? "Signaler" : "Report"}
            className="flex size-6 items-center justify-center text-text-tertiary transition hover:text-warning"
          >
            <Flag className="size-3.5" strokeWidth={1.7} />
          </button>
        )}
        {isAdmin && (
          <button
            type="button"
            onClick={() => onPin(m.id, !m.pinned_at)}
            aria-label={m.pinned_at ? (fr ? "Désépingler" : "Unpin") : fr ? "Épingler" : "Pin"}
            className="flex size-6 items-center justify-center text-text-tertiary transition hover:text-gold-300"
          >
            {m.pinned_at ? (
              <PinOff className="size-3.5" strokeWidth={1.7} />
            ) : (
              <Pin className="size-3.5" strokeWidth={1.7} />
            )}
          </button>
        )}
        {canMute && (
          <button
            type="button"
            onClick={() => onMute(m.user_id, !isAuthorMuted, m.author.username)}
            aria-label={
              isAuthorMuted ? (fr ? "Réactiver" : "Unmute") : fr ? "Rendre muet" : "Mute"
            }
            className={cn(
              "flex size-6 items-center justify-center text-text-tertiary transition",
              isAuthorMuted ? "hover:text-primary-300" : "hover:text-error",
            )}
          >
            {isAuthorMuted ? (
              <Volume2 className="size-3.5" strokeWidth={1.7} />
            ) : (
              <MicOff className="size-3.5" strokeWidth={1.7} />
            )}
          </button>
        )}
        {(isAdmin || isMine) && (
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
