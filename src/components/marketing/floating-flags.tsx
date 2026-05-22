// Decorative background: floating country flags with subtle animation
// Server component — pure CSS animations, no JS.

const FLAGS = [
  { iso: "fr", top: "8%", left: "4%", size: 56, delay: 0, dur: 18 },
  { iso: "br", top: "16%", right: "8%", size: 72, delay: 2, dur: 22 },
  { iso: "ar", top: "32%", left: "10%", size: 64, delay: 4, dur: 20 },
  { iso: "de", top: "52%", right: "14%", size: 56, delay: 6, dur: 24 },
  { iso: "es", top: "68%", left: "16%", size: 60, delay: 8, dur: 26 },
  { iso: "gb", top: "78%", right: "4%", size: 52, delay: 10, dur: 19 },
  { iso: "it", top: "12%", left: "60%", size: 48, delay: 3, dur: 21 },
  { iso: "pt", top: "44%", left: "70%", size: 52, delay: 9, dur: 23 },
  { iso: "us", top: "80%", left: "40%", size: 56, delay: 5, dur: 25 },
  { iso: "ca", top: "24%", left: "32%", size: 44, delay: 7, dur: 20 },
  { iso: "mx", top: "60%", left: "44%", size: 48, delay: 1, dur: 22 },
] as const;

export function FloatingFlags() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {/* Radial color wash */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_20%_10%,rgba(34,217,130,0.06),transparent_50%),radial-gradient(ellipse_60%_50%_at_80%_30%,rgba(124,92,255,0.06),transparent_50%),radial-gradient(ellipse_60%_40%_at_50%_100%,rgba(245,196,71,0.04),transparent_60%)]" />

      {FLAGS.map((f, i) => {
        const w = f.size;
        const h = Math.round((w * 3) / 4);
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={`https://flagcdn.com/${w}x${h}/${f.iso}.png`}
            width={w}
            height={h}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute select-none rounded-[3px] opacity-25 shadow-2xl shadow-black/40 ring-1 ring-black/30 [animation:floaty_var(--dur)_ease-in-out_infinite] [animation-delay:var(--delay)]"
            style={{
              top: "top" in f ? f.top : undefined,
              left: "left" in f ? f.left : undefined,
              right: "right" in f ? f.right : undefined,
              width: w,
              height: h,
              ...({ "--dur": `${f.dur}s`, "--delay": `${f.delay}s` } as React.CSSProperties),
            }}
          />
        );
      })}

      <style>{`
        @keyframes floaty {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(-2deg); }
          50% { transform: translate3d(0, -16px, 0) rotate(2deg); }
        }
      `}</style>
    </div>
  );
}
