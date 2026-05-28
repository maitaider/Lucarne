"use client";

import { useEffect } from "react";

/**
 * Error boundary for the authenticated app segment.
 *
 * Its main job is to self-heal `ChunkLoadError` — Next's dev server (and
 * prod right after a deploy) can leave a tab holding stale chunk hashes,
 * so the next navigation fails to load a route chunk. We reload once
 * (guarded against loops) to fetch a fresh manifest. Any other error
 * shows a minimal, on-brand retry card.
 */
function isChunkError(error: { name?: string; message?: string }): boolean {
  const msg = error?.message ?? "";
  return (
    error?.name === "ChunkLoadError" ||
    /ChunkLoadError/i.test(msg) ||
    /Loading chunk [\s\S]+ failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg)
  );
}

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const chunk = isChunkError(error);

  useEffect(() => {
    if (!chunk) return;
    const KEY = "lucarne:chunk-reloaded-at";
    const last = Number(sessionStorage.getItem(KEY) ?? "0");
    // Reload at most once per 8s so a genuinely broken chunk can't loop.
    if (Date.now() - last > 8000) {
      sessionStorage.setItem(KEY, String(Date.now()));
      window.location.reload();
    }
  }, [chunk]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="rounded-md border border-border-subtle bg-surface-1 p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold text-text-primary">
          {chunk ? "Mise à jour…" : "Une erreur est survenue"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          {chunk
            ? "Nouvelle version chargée, on rafraîchit la page."
            : "Quelque chose s'est mal passé. Réessaie — si ça persiste, recharge la page."}
        </p>
        {!chunk && (
          <button
            type="button"
            onClick={() => reset()}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-sm bg-primary-500 px-5 text-sm font-semibold text-abyss shadow-glow-primary transition hover:bg-primary-400"
          >
            Réessayer
          </button>
        )}
      </div>
    </div>
  );
}
