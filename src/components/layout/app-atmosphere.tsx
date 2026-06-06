"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

/**
 * Full-page background atmosphere for the connected app.
 *
 * Route-aware: a few pages get a dedicated nation celebration photo as the
 * page backdrop (with a lighter wash + higher opacity so the photo actually
 * reads), while every other page keeps the default subtle stadium wash.
 *
 * Rendered as a direct child of the layout's `relative isolate` container, so
 * it sits behind ALL page content (-z-30 image, -z-20 gradient, -z-10 grid).
 */
const NATION_BACKDROPS: { test: RegExp; src: string; position: string }[] = [
  {
    test: /\/matches(\/|$)/,
    src: "/assets/lucarne/world-cup-2026/14-canada-winter-toronto-sprint.png",
    position: "object-[66%_26%]",
  },
  {
    test: /\/teams(\/|$)/,
    src: "/assets/lucarne/world-cup-2026/13-algeria-stadium-control.png",
    position: "object-[58%_30%]",
  },
];

export function AppAtmosphere() {
  const pathname = usePathname();
  const nation = NATION_BACKDROPS.find((n) => n.test.test(pathname));

  const src = nation?.src ?? "/marketing/lucarne-hero-stadium.jpg";
  const position = nation?.position ?? "object-[68%_44%]";
  const imageOpacity = nation ? "opacity-[0.42]" : "opacity-[0.18]";
  const gradient = nation
    ? "bg-[radial-gradient(ellipse_70%_45%_at_50%_0%,rgba(5,6,5,0.30),transparent_62%),linear-gradient(180deg,rgba(5,6,5,0.42)_0%,rgba(5,6,5,0.86)_52%,rgba(5,6,5,0.97)_100%)]"
    : "bg-[radial-gradient(ellipse_55%_32%_at_18%_0%,rgba(34,217,130,0.16),transparent_68%),radial-gradient(ellipse_42%_30%_at_86%_8%,rgba(124,92,255,0.13),transparent_62%),linear-gradient(180deg,rgba(5,6,5,0.72)_0%,rgba(5,6,5,0.94)_46%,rgba(5,6,5,0.98)_100%)]";

  return (
    <>
      <Image
        src={src}
        alt=""
        fill
        sizes="100vw"
        className={`absolute inset-0 -z-30 object-cover ${position} ${imageOpacity}`}
      />
      <div className={`fixed inset-0 -z-20 ${gradient}`} />
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
    </>
  );
}
