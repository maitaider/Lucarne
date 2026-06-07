"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

/**
 * Full-page background atmosphere for the connected app.
 *
 * Route-aware: a few pages get a dedicated nation celebration photo pinned to
 * the viewport as the page backdrop (clearly visible, content scrolls over it),
 * while every other page keeps the default subtle stadium wash.
 *
 * Rendered as a direct child of the layout's `relative isolate` container, so
 * it sits behind ALL page content.
 */
const NATION_BACKDROPS: {
  test: RegExp;
  src: string;
  position: string;
  /** Content-dense page → keep the photo as faint ambiance, not a loud backdrop. */
  dim?: boolean;
}[] = [
  {
    test: /\/dashboard(\/|$)/,
    src: "/assets/lucarne/world-cup-2026/11-algeria-2026-home-celebration.png",
    position: "object-[58%_22%]",
    dim: true,
  },
  {
    test: /\/matches(\/|$)/,
    src: "/assets/lucarne/world-cup-2026/14-canada-winter-toronto-sprint.png",
    position: "object-[70%_22%]",
  },
  {
    test: /\/teams(\/|$)/,
    src: "/assets/lucarne/world-cup-2026/13-algeria-stadium-control.png",
    position: "object-[60%_28%]",
  },
  {
    test: /\/chat(\/|$)/,
    src: "/assets/lucarne/world-cup-2026/12-canada-2026-home-celebration.png",
    position: "object-[60%_26%]",
  },
  {
    test: /\/live(\/|$)/,
    src: "/assets/lucarne/world-cup-2026/04-argentina-net-shot.png",
    position: "object-[55%_30%]",
  },
  {
    test: /\/leaderboard(\/|$)/,
    src: "/assets/lucarne/world-cup-2026/05-brazil-volley-night.png",
    position: "object-[58%_30%]",
  },
  {
    test: /\/buy-in(\/|$)/,
    src: "/assets/lucarne/world-cup-2026/07-morocco-supporters-celebration.png",
    position: "object-[55%_28%]",
  },
  {
    test: /\/leagues(\/|$)/,
    src: "/assets/lucarne/world-cup-2026/02-mexico-azteca-celebration.png",
    position: "object-[58%_30%]",
  },
  {
    test: /\/news(\/|$)/,
    src: "/assets/lucarne/world-cup-2026/09-stadium-supporters-sunset.png",
    position: "object-[55%_35%]",
  },
  {
    test: /\/how-it-works(\/|$)/,
    src: "/assets/lucarne/world-cup-2026/09-stadium-supporters-sunset.png",
    position: "object-[50%_25%]",
  },
  {
    test: /\/profile(\/|$)/,
    src: "/assets/lucarne/world-cup-2026/03-usa-final-strike.png",
    position: "object-[58%_28%]",
  },
  {
    test: /\/predict(\/|$)/,
    src: "/assets/lucarne/world-cup-2026/11-algeria-2026-home-celebration.png",
    position: "object-[55%_28%]",
  },
];

export function AppAtmosphere() {
  const pathname = usePathname();
  const nation = NATION_BACKDROPS.find((n) => n.test.test(pathname));

  if (nation) {
    // Viewport-pinned photo backdrop — clearly visible, content scrolls over it.
    return (
      <>
        <div className="pointer-events-none fixed inset-0 -z-30 overflow-hidden">
          <Image
            src={nation.src}
            alt=""
            fill
            priority
            sizes="100vw"
            className={`object-cover ${nation.position} ${
              nation.dim ? "opacity-[0.16]" : "opacity-[0.88]"
            }`}
          />
        </div>
        <div
          className={`pointer-events-none fixed inset-0 -z-20 ${
            nation.dim
              ? "bg-[linear-gradient(180deg,rgba(5,6,5,0.78)_0%,rgba(5,6,5,0.9)_48%,rgba(5,6,5,0.97)_100%)]"
              : "bg-[linear-gradient(180deg,rgba(5,6,5,0.22)_0%,rgba(5,6,5,0.4)_45%,rgba(5,6,5,0.62)_100%)]"
          }`}
        />
        <AtmosphereGrid />
      </>
    );
  }

  return (
    <>
      <Image
        src="/marketing/lucarne-hero-stadium.jpg"
        alt=""
        fill
        sizes="100vw"
        className="absolute inset-0 -z-30 object-cover object-[68%_44%] opacity-[0.18]"
      />
      <div className="fixed inset-0 -z-20 bg-[radial-gradient(ellipse_55%_32%_at_18%_0%,rgba(34,217,130,0.16),transparent_68%),radial-gradient(ellipse_42%_30%_at_86%_8%,rgba(124,92,255,0.13),transparent_62%),linear-gradient(180deg,rgba(5,6,5,0.72)_0%,rgba(5,6,5,0.94)_46%,rgba(5,6,5,0.98)_100%)]" />
      <AtmosphereGrid />
    </>
  );
}

function AtmosphereGrid() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 opacity-[0.055]"
      style={{
        backgroundImage:
          "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
        backgroundSize: "72px 72px",
        maskImage: "linear-gradient(to bottom, black 0%, transparent 80%)",
      }}
    />
  );
}
