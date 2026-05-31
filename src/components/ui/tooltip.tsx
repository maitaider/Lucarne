"use client";

import { useState, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Lightweight, dependency-free tooltip. Hover or focus the child to reveal.
 * Positioned above the trigger by default. Works on touch via long-press
 * (handled by the browser's :focus on tap).
 */
export function Tooltip({
  content,
  children,
  side = "top",
  className,
}: {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  return (
    <span
      ref={wrapperRef}
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={cn(
            "pointer-events-none absolute left-1/2 z-50 w-max max-w-[16rem] -translate-x-1/2 rounded-xs border border-white/[0.12] bg-abyss/95 px-2.5 py-1.5 text-[11px] leading-4 text-text-primary shadow-2xl backdrop-blur-xl",
            side === "top" ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]",
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
