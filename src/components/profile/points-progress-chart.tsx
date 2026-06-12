import type { PointsHistoryPoint } from "@/lib/leagues/standings-history";
import type { Locale } from "@/i18n/routing";

/**
 * Dependency-free SVG area chart of a player's cumulative points per day. Dark
 * theme via design tokens (CSS vars). Shows a gentle placeholder until there
 * are at least two daily snapshots to draw a line between.
 */
export function PointsProgressChart({
  data,
  locale,
}: {
  data: PointsHistoryPoint[];
  locale: Locale;
}) {
  const fr = locale === "fr";

  if (data.length < 2) {
    return (
      <div className="rounded-md border border-white/[0.08] bg-surface-1/[0.5] px-5 py-8 text-center text-sm text-text-tertiary backdrop-blur-md">
        {fr
          ? "La courbe de progression se remplit chaque jour du tournoi."
          : "The progression curve fills in each day of the tournament."}
      </div>
    );
  }

  const W = 600;
  const H = 200;
  const PAD = { t: 16, r: 16, b: 26, l: 34 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const maxPts = Math.max(...data.map((d) => d.points), 1);

  const x = (i: number) => PAD.l + (i / (data.length - 1)) * innerW;
  const y = (p: number) => PAD.t + innerH - (p / maxPts) * innerH;

  const line = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(d.points).toFixed(1)}`)
    .join(" ");
  const area = `${line} L ${x(data.length - 1).toFixed(1)} ${(PAD.t + innerH).toFixed(1)} L ${x(0).toFixed(1)} ${(PAD.t + innerH).toFixed(1)} Z`;

  const fmt = (s: string) =>
    new Date(`${s}T00:00:00`).toLocaleDateString(fr ? "fr-FR" : "en-US", {
      day: "2-digit",
      month: "short",
    });

  return (
    <div className="rounded-md border border-white/[0.08] bg-surface-1/[0.5] p-4 backdrop-blur-md">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={
          fr ? "Courbe de progression des points" : "Points progression chart"
        }
      >
        <defs>
          <linearGradient id="pp-fill" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-primary-500)"
              stopOpacity="0.34"
            />
            <stop
              offset="100%"
              stopColor="var(--color-primary-500)"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        <line
          x1={PAD.l}
          y1={PAD.t}
          x2={W - PAD.r}
          y2={PAD.t}
          stroke="rgba(255,255,255,0.06)"
        />
        <line
          x1={PAD.l}
          y1={PAD.t + innerH}
          x2={W - PAD.r}
          y2={PAD.t + innerH}
          stroke="rgba(255,255,255,0.12)"
        />
        <text
          x={PAD.l - 6}
          y={PAD.t + 4}
          textAnchor="end"
          fill="var(--color-text-tertiary)"
          fontSize="10"
        >
          {maxPts}
        </text>
        <text
          x={PAD.l - 6}
          y={PAD.t + innerH}
          textAnchor="end"
          fill="var(--color-text-tertiary)"
          fontSize="10"
        >
          0
        </text>

        <path d={area} fill="url(#pp-fill)" />
        <path
          d={line}
          fill="none"
          stroke="var(--color-primary-400)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {data.map((d, i) => (
          <circle
            key={d.date}
            cx={x(i)}
            cy={y(d.points)}
            r="2.5"
            fill="var(--color-primary-300)"
          />
        ))}

        <text
          x={x(0)}
          y={H - 7}
          textAnchor="start"
          fill="var(--color-text-tertiary)"
          fontSize="10"
        >
          {fmt(data[0].date)}
        </text>
        <text
          x={x(data.length - 1)}
          y={H - 7}
          textAnchor="end"
          fill="var(--color-text-tertiary)"
          fontSize="10"
        >
          {fmt(data[data.length - 1].date)}
        </text>
      </svg>
    </div>
  );
}
