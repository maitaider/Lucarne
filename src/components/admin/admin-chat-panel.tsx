"use client";

import { useState, useTransition } from "react";
import { Link } from "@/i18n/navigation";
import {
  deleteChatMessage,
  setChatMute,
  setChatPin,
  resolveChatReport,
} from "@/lib/chat/actions";
import type {
  ChatReport,
  MutedMember,
  ChatRecentMessage,
  ChatModStats,
} from "@/lib/chat/admin";
import { UserAvatar } from "@/components/ui/user-avatar";
import { CountUp } from "@/components/ui/count-up";
import { useToast } from "@/components/ui/toast-provider";
import { cn } from "@/lib/utils";
import {
  CheckCheck,
  Flag,
  MessagesSquare,
  MicOff,
  Trash2,
  Volume2,
  Users,
  Clock,
  ExternalLink,
} from "lucide-react";
import type { Locale } from "@/i18n/routing";

function timeAgo(iso: string, locale: Locale): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return locale === "fr" ? "à l'instant" : "just now";
  if (min < 60) return `${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} h`;
  const day = Math.floor(hr / 24);
  return `${day} j`;
}

export function AdminChatPanel({
  reports: initialReports,
  muted: initialMuted,
  recent: initialRecent,
  stats,
  locale,
}: {
  reports: ChatReport[];
  muted: MutedMember[];
  recent: ChatRecentMessage[];
  stats: ChatModStats;
  locale: Locale;
}) {
  const fr = locale === "fr";
  const lc = fr ? "fr-FR" : "en-US";
  const toast = useToast();
  const [, startTransition] = useTransition();

  const [reports, setReports] = useState(initialReports);
  const [muted, setMuted] = useState(initialMuted);
  const [recent, setRecent] = useState(initialRecent);
  const [mutedSet, setMutedSet] = useState<Set<string>>(
    () => new Set(initialMuted.map((m) => m.user_id)),
  );

  function resolve(commentId: string) {
    startTransition(async () => {
      const res = await resolveChatReport(commentId, locale);
      if (res.ok) {
        setReports((r) => r.filter((x) => x.comment_id !== commentId));
        toast.success(fr ? "Signalement classé." : "Report resolved.");
      } else toast.error(res.message ?? "");
    });
  }

  function removeMessage(commentId: string) {
    startTransition(async () => {
      const res = await deleteChatMessage(commentId, locale);
      if (res.ok) {
        setReports((r) => r.filter((x) => x.comment_id !== commentId));
        setRecent((r) => r.filter((x) => x.id !== commentId));
        toast.success(fr ? "Message supprimé." : "Message deleted.");
      } else toast.error(res.message ?? "");
    });
  }

  function toggleMute(userId: string, username: string, mute: boolean) {
    startTransition(async () => {
      const res = await setChatMute(userId, mute, locale);
      if (!res.ok) {
        toast.error(res.message ?? "");
        return;
      }
      setMutedSet((s) => {
        const n = new Set(s);
        if (mute) n.add(userId);
        else n.delete(userId);
        return n;
      });
      if (!mute) setMuted((m) => m.filter((x) => x.user_id !== userId));
      toast.success(
        mute
          ? fr
            ? `@${username} rendu muet.`
            : `@${username} muted.`
          : fr
            ? `@${username} réactivé.`
            : `@${username} unmuted.`,
      );
    });
  }

  function togglePin(id: string, pinned: boolean) {
    startTransition(async () => {
      const res = await setChatPin(id, pinned, locale);
      if (res.ok)
        setRecent((r) =>
          r.map((x) =>
            x.id === id
              ? { ...x, pinned_at: pinned ? new Date().toISOString() : null }
              : x,
          ),
        );
      else toast.error(res.message ?? "");
    });
  }

  const kpis = [
    { icon: MessagesSquare, label: fr ? "Messages" : "Messages", value: stats.total, tone: "primary" as const },
    { icon: Clock, label: fr ? "Sur 24 h" : "Past 24h", value: stats.last24h, tone: "primary" as const },
    { icon: Users, label: fr ? "Actifs 24 h" : "Active 24h", value: stats.activeChatters, tone: "violet" as const },
    { icon: MicOff, label: fr ? "Muets" : "Muted", value: muted.length, tone: "gold" as const },
    { icon: Flag, label: fr ? "Signalements" : "Reports", value: reports.length, tone: "error" as const },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-text-primary">
          {fr ? "Modération du Salon" : "Lounge moderation"}
        </h2>
        <p className="text-xs text-text-tertiary">
          {fr
            ? "Signalements, membres muets et derniers messages · toutes les actions sont tracées."
            : "Reports, muted members and latest messages · every action is audited."}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => {
          const Icon = k.icon;
          const tone =
            k.tone === "violet"
              ? "text-violet-300"
              : k.tone === "gold"
                ? "text-gold-300"
                : k.tone === "error"
                  ? "text-error"
                  : "text-primary-300";
          return (
            <div
              key={k.label}
              className="rounded-[10px] border border-white/[0.08] bg-surface-1/[0.5] p-3 backdrop-blur-xl"
            >
              <div className={cn("flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider", tone)}>
                <Icon className="size-3.5" strokeWidth={2} />
                {k.label}
              </div>
              <div className="mt-1 font-display text-2xl font-bold text-text-primary">
                <CountUp value={k.value} locale={lc} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Reported messages */}
      <section className="rounded-[12px] border border-white/[0.08] bg-surface-1/[0.45] p-4 backdrop-blur-xl">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Flag className="size-4 text-error" strokeWidth={1.8} />
          {fr ? "Messages signalés" : "Reported messages"}
          {reports.length > 0 && (
            <span className="rounded-full bg-error/15 px-1.5 py-0.5 text-[10px] font-bold text-error">
              {reports.length}
            </span>
          )}
        </h3>
        {reports.length === 0 ? (
          <p className="py-4 text-center text-xs text-text-tertiary">
            {fr ? "Aucun signalement en attente 🎉" : "No pending reports 🎉"}
          </p>
        ) : (
          <ul className="space-y-2">
            {reports.map((r) => (
              <li
                key={r.comment_id}
                className="rounded-[10px] border border-error/20 bg-error/[0.04] p-3"
              >
                <div className="flex items-start gap-3">
                  <UserAvatar
                    src={r.author_avatar_url}
                    name={r.author_username}
                    className="size-8 ring-1 ring-white/[0.1]"
                    fallbackClassName="bg-gradient-to-br from-primary-500/30 to-violet-500/30 font-mono text-[11px] font-bold text-text-primary"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/u/${r.author_username}`}
                        className="text-xs font-semibold text-text-primary hover:text-primary-300 hover:underline"
                      >
                        @{r.author_username}
                      </Link>
                      <span className="rounded-full bg-error/15 px-1.5 text-[10px] font-bold text-error">
                        {r.report_count} {fr ? "signalement" : "report"}
                        {r.report_count > 1 ? "s" : ""}
                      </span>
                      {mutedSet.has(r.author_id) && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-error/15 px-1.5 text-[9px] font-bold uppercase text-error">
                          <MicOff className="size-2.5" strokeWidth={2.5} />
                          {fr ? "muet" : "muted"}
                        </span>
                      )}
                      {r.message_deleted && (
                        <span className="rounded-full bg-white/[0.06] px-1.5 text-[9px] font-bold uppercase text-text-tertiary">
                          {fr ? "supprimé" : "deleted"}
                        </span>
                      )}
                      <span className="text-[10px] text-text-tertiary">
                        {timeAgo(r.first_reported_at, locale)}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-text-secondary">
                      {r.body}
                    </p>
                    {r.reasons.length > 0 && (
                      <p className="mt-1 text-[11px] italic text-text-tertiary">
                        {fr ? "Motifs : " : "Reasons: "}
                        {r.reasons.join(" · ")}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {!r.message_deleted && (
                        <button
                          type="button"
                          onClick={() => removeMessage(r.comment_id)}
                          className="inline-flex items-center gap-1 rounded-md border border-error/30 bg-error/10 px-2 py-1 text-[11px] font-semibold text-error transition hover:bg-error/20"
                        >
                          <Trash2 className="size-3" strokeWidth={2} />
                          {fr ? "Supprimer" : "Delete"}
                        </button>
                      )}
                      {!mutedSet.has(r.author_id) && (
                        <button
                          type="button"
                          onClick={() => toggleMute(r.author_id, r.author_username, true)}
                          className="inline-flex items-center gap-1 rounded-md border border-white/[0.12] bg-white/[0.04] px-2 py-1 text-[11px] font-semibold text-text-secondary transition hover:border-error/40 hover:text-error"
                        >
                          <MicOff className="size-3" strokeWidth={2} />
                          {fr ? "Rendre muet" : "Mute"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => resolve(r.comment_id)}
                        className="inline-flex items-center gap-1 rounded-md border border-primary-500/30 bg-primary-500/10 px-2 py-1 text-[11px] font-semibold text-primary-200 transition hover:bg-primary-500/20"
                      >
                        <CheckCheck className="size-3" strokeWidth={2} />
                        {fr ? "Classer" : "Resolve"}
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Muted members */}
      <section className="rounded-[12px] border border-white/[0.08] bg-surface-1/[0.45] p-4 backdrop-blur-xl">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
          <MicOff className="size-4 text-gold-300" strokeWidth={1.8} />
          {fr ? "Membres muets" : "Muted members"}
        </h3>
        {muted.length === 0 ? (
          <p className="py-4 text-center text-xs text-text-tertiary">
            {fr ? "Personne n'est muet." : "Nobody is muted."}
          </p>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {muted.map((m) => (
              <li key={m.user_id} className="flex items-center gap-3 py-2">
                <UserAvatar
                  src={m.avatar_url}
                  name={m.display_name ?? m.username}
                  className="size-8 ring-1 ring-white/[0.1]"
                  fallbackClassName="bg-gradient-to-br from-primary-500/30 to-violet-500/30 font-mono text-[11px] font-bold text-text-primary"
                />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/u/${m.username}`}
                    className="text-sm font-semibold text-text-primary hover:text-primary-300 hover:underline"
                  >
                    @{m.username}
                  </Link>
                  <p className="text-[11px] text-text-tertiary">
                    {fr ? "depuis " : "since "}
                    {timeAgo(m.created_at, locale)}
                    {m.muted_by_username ? ` · @${m.muted_by_username}` : ""}
                    {m.reason ? ` · « ${m.reason} »` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleMute(m.user_id, m.username, false)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-primary-500/30 bg-primary-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-primary-200 transition hover:bg-primary-500/20"
                >
                  <Volume2 className="size-3.5" strokeWidth={2} />
                  {fr ? "Réactiver" : "Unmute"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recent messages */}
      <section className="rounded-[12px] border border-white/[0.08] bg-surface-1/[0.45] p-4 backdrop-blur-xl">
        <h3 className="mb-3 flex items-center justify-between gap-2 text-sm font-semibold text-text-primary">
          <span className="flex items-center gap-2">
            <MessagesSquare className="size-4 text-primary-300" strokeWidth={1.8} />
            {fr ? "Derniers messages" : "Latest messages"}
          </span>
          <Link
            href="/chat"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-text-tertiary transition hover:text-primary-300"
          >
            {fr ? "Ouvrir le Salon" : "Open the Lounge"}
            <ExternalLink className="size-3" strokeWidth={2} />
          </Link>
        </h3>
        {recent.length === 0 ? (
          <p className="py-4 text-center text-xs text-text-tertiary">
            {fr ? "Aucun message." : "No messages."}
          </p>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {recent.map((m) => (
              <li key={m.id} className="group flex items-start gap-2.5 py-2">
                <UserAvatar
                  src={m.author.avatar_url}
                  name={m.author.display_name ?? m.author.username}
                  className="size-7 ring-1 ring-white/[0.1]"
                  fallbackClassName="bg-gradient-to-br from-primary-500/30 to-violet-500/30 font-mono text-[10px] font-bold text-text-primary"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-text-primary">
                      @{m.author.username}
                    </span>
                    <span className="text-[10px] text-text-tertiary">
                      {timeAgo(m.created_at, locale)}
                    </span>
                    {m.pinned_at && (
                      <span className="text-[9px] font-bold uppercase text-gold-300">
                        {fr ? "épinglé" : "pinned"}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm text-text-secondary">{m.body}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => togglePin(m.id, !m.pinned_at)}
                    className="text-text-tertiary transition hover:text-gold-300"
                    aria-label={m.pinned_at ? (fr ? "Désépingler" : "Unpin") : fr ? "Épingler" : "Pin"}
                  >
                    📌
                  </button>
                  <button
                    type="button"
                    onClick={() => removeMessage(m.id)}
                    className="text-text-tertiary transition hover:text-error"
                    aria-label={fr ? "Supprimer" : "Delete"}
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.7} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
