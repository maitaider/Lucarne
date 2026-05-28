"use client";

import { useEffect } from "react";

/**
 * Catches async `ChunkLoadError` (e.g. a dynamic import rejecting after a
 * deploy or dev restart left the tab with stale chunk hashes) at the window
 * level and reloads once to fetch a fresh manifest. Render-time chunk errors
 * are handled by the segment error boundary; this covers the async path.
 */
function isChunk(msg?: string | null, name?: string | null): boolean {
  if (name === "ChunkLoadError") return true;
  if (!msg) return false;
  return (
    /ChunkLoadError/i.test(msg) ||
    /Loading chunk [\s\S]+ failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg)
  );
}

export function ChunkReloadGuard() {
  useEffect(() => {
    const KEY = "lucarne:chunk-reloaded-at";
    function recover() {
      const last = Number(sessionStorage.getItem(KEY) ?? "0");
      if (Date.now() - last < 8000) return; // never loop
      sessionStorage.setItem(KEY, String(Date.now()));
      window.location.reload();
    }
    function onError(e: ErrorEvent) {
      if (isChunk(e.message, (e.error as Error | undefined)?.name)) recover();
    }
    function onRejection(e: PromiseRejectionEvent) {
      const r = e.reason as { message?: string; name?: string } | string | undefined;
      if (typeof r === "string" ? isChunk(r) : isChunk(r?.message, r?.name)) {
        recover();
      }
    }
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
