/**
 * Shared loading skeleton for all (app) routes — shown during server data
 * fetches so navigation feels instant instead of blank.
 */
export default function AppLoading() {
  return (
    <div
      className="mx-auto w-full max-w-[1700px] px-4 py-8 sm:px-6 lg:px-8"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Chargement…</span>
      <div className="animate-pulse space-y-5">
        {/* Hero band */}
        <div className="h-40 rounded-lg border border-white/[0.08] bg-surface-1/[0.6]" />
        {/* Stat row */}
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-lg border border-white/[0.08] bg-surface-1/[0.5]"
            />
          ))}
        </div>
        {/* Content block */}
        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="h-72 rounded-lg border border-white/[0.08] bg-surface-1/[0.5]" />
          <div className="h-72 rounded-lg border border-white/[0.08] bg-surface-1/[0.4]" />
        </div>
      </div>
    </div>
  );
}
