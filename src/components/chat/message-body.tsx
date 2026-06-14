"use client";

import { Fragment } from "react";
import { Link } from "@/i18n/navigation";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

/** Strict UUID, used to pull a betId out of a pasted share link. */
const BETID_RE =
  /\/p\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/;

/** Tokenizes a message into URLs, /p/<uuid> share links, and @mentions. */
const TOKEN_RE =
  /(https?:\/\/[^\s]+|\/(?:[a-z]{2}\/)?p\/[0-9a-fA-F-]{36}|@[A-Za-z0-9_-]{3,24})/g;

function shorten(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "").slice(0, 48);
}

/**
 * Renders a salon message body: plain text, with @mentions of known members
 * linked to their profile, pasted prediction links (`/p/<betId>`) rendered as a
 * compact chip, and other URLs made clickable.
 */
export function MessageBody({
  body,
  memberUsernames,
  locale,
  highlightUsername,
}: {
  body: string;
  /** Lowercased set of known usernames (only these become mention links). */
  memberUsernames: Set<string>;
  locale: Locale;
  /** When a mention matches this username, render it as a "you" highlight. */
  highlightUsername?: string | null;
}) {
  const nodes: React.ReactNode[] = [];
  const re = new RegExp(TOKEN_RE);
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;

  while ((m = re.exec(body)) !== null) {
    const token = m[0];
    if (m.index > last) nodes.push(<Fragment key={key++}>{body.slice(last, m.index)}</Fragment>);
    last = m.index + token.length;

    const bet = token.match(BETID_RE);
    if (bet) {
      nodes.push(
        <Link
          key={key++}
          href={`/p/${bet[1]}`}
          className="mx-0.5 inline-flex max-w-full items-center gap-1 rounded-full border border-primary-500/35 bg-primary-500/10 px-2 py-0.5 align-middle text-[11px] font-semibold text-primary-200 transition hover:border-primary-500/60 hover:bg-primary-500/15"
        >
          <BarChart3 className="size-3 shrink-0" strokeWidth={2} />
          {locale === "fr" ? "Voir le prono" : "View prediction"}
        </Link>,
      );
    } else if (token.startsWith("@")) {
      const uname = token.slice(1);
      if (memberUsernames.has(uname.toLowerCase())) {
        const isMe =
          !!highlightUsername &&
          uname.toLowerCase() === highlightUsername.toLowerCase();
        nodes.push(
          <Link
            key={key++}
            href={`/u/${uname}`}
            className={cn(
              "font-semibold transition hover:underline",
              isMe
                ? "rounded bg-primary-500/20 px-1 text-primary-100 ring-1 ring-primary-500/30"
                : "text-primary-300",
            )}
          >
            {token}
          </Link>,
        );
      } else {
        nodes.push(<Fragment key={key++}>{token}</Fragment>);
      }
    } else {
      // generic http(s) URL
      nodes.push(
        <a
          key={key++}
          href={token}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="break-all text-primary-300 underline decoration-primary-500/40 underline-offset-2 transition hover:decoration-primary-400"
        >
          {shorten(token)}
        </a>,
      );
    }
  }
  if (last < body.length) nodes.push(<Fragment key={key++}>{body.slice(last)}</Fragment>);

  return (
    <span className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-text-secondary sm:text-sm">
      {nodes}
    </span>
  );
}
