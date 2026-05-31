"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Wraps a leaderboard row and flashes it green when its points increase
 * (detected across live refreshes — the client instance, keyed by user, keeps
 * the previous value). Renders a <tr> (table) or <li> (list) via `as`.
 */
export function FlashRow({
  as = "tr",
  points,
  className,
  children,
}: {
  as?: "tr" | "li" | "div";
  points: number;
  className?: string;
  children: React.ReactNode;
}) {
  const prev = useRef<number | null>(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (prev.current !== null && points > prev.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1700);
      prev.current = points;
      return () => clearTimeout(t);
    }
    prev.current = points;
  }, [points]);

  const cls = cn(className, flash && "lk-flash-points");
  if (as === "li") return <li className={cls}>{children}</li>;
  if (as === "div") return <div className={cls}>{children}</div>;
  return <tr className={cls}>{children}</tr>;
}
