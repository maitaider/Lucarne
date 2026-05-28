#!/usr/bin/env node
/**
 * Wrapper around `next dev` that survives Next 16.1.7's intermittent
 * manifest-deletion bug.
 *
 * Symptom: while the dev server is running, files like
 *   .next/dev/prerender-manifest.json
 *   .next/dev/server/middleware-manifest.json
 *   .next/dev/server/pages-manifest.json
 * randomly disappear (during recompilation, server restart, or under load).
 * The next request then 500s with `ENOENT: ... <manifest>.json`.
 *
 * Workaround: pre-seed valid stubs for the manifests Next needs to read,
 * then watch `.next/dev` and immediately re-create any stub that gets
 * deleted. Next overwrites the stubs with the real content on a clean
 * compile, so this is a no-op in the happy path.
 *
 * Both `--turbopack` and `--webpack` are affected; default mode is
 * turbopack (most stable). Override with `pnpm dev:webpack`.
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, watch, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

// Derive the project root from THIS file's location (scripts/ -> root) and
// chdir to it up front. Some launchers (e.g. the preview runner) spawn this
// process with a broken / inaccessible cwd, so `process.cwd()` throws
// `EPERM uv_cwd`. chdir-ing to a known absolute path repairs the cwd before
// Next — or anything else — ever reads it.
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
try {
  process.chdir(ROOT);
} catch {
  // best-effort: ROOT is still correct for the paths computed below.
}
const DEV_DIR = join(ROOT, ".next", "dev");
const SERVER_DIR = join(DEV_DIR, "server");

// Pick mode from argv. Default: webpack.
// Turbopack on Next 16.1.7 also loses per-page manifests and SSR runtime
// chunks (`[turbopack]_runtime.js`) which a generic stubber can't cover —
// the chunk content is route-specific. Webpack only loses the global
// `prerender-manifest.json`, which we stub below. So webpack + this guard
// is stable; turbopack + this guard is not.
const mode = process.argv.includes("--turbopack") ? "--turbopack" : "--webpack";

/** Stub generators keyed by the path relative to .next/dev */
const STUBS = {
  "prerender-manifest.json": () =>
    JSON.stringify(
      {
        version: 4,
        routes: {},
        dynamicRoutes: {},
        notFoundRoutes: [],
        preview: {
          previewModeId: randomBytes(16).toString("hex"),
          previewModeSigningKey: randomBytes(32).toString("hex"),
          previewModeEncryptionKey: randomBytes(32).toString("hex"),
        },
      },
      null,
      2,
    ),
  "routes-manifest.json": () =>
    JSON.stringify({
      version: 3,
      pages404: true,
      caseSensitive: false,
      basePath: "",
      redirects: [],
      rewrites: [],
      headers: [],
      staticRoutes: [],
      dynamicRoutes: [],
      dataRoutes: [],
      i18n: null,
    }),
  "server/pages-manifest.json": () => "{}",
  "server/app-paths-manifest.json": () => "{}",
  "server/middleware-manifest.json": () =>
    JSON.stringify({
      version: 3,
      sortedMiddleware: [],
      middleware: {},
      functions: {},
    }),
  "server/next-font-manifest.json": () =>
    JSON.stringify({
      pages: {},
      app: {},
      appUsingSizeAdjust: false,
      pagesUsingSizeAdjust: false,
    }),
};

function ensureStub(rel) {
  const full = join(DEV_DIR, rel);
  if (existsSync(full)) return false;
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, STUBS[rel]());
  return true;
}

function seedAll() {
  mkdirSync(SERVER_DIR, { recursive: true });
  let written = 0;
  for (const rel of Object.keys(STUBS)) {
    if (ensureStub(rel)) written++;
  }
  return written;
}

// 1. Seed before starting Next so the first POST / Server Action works.
seedAll();

// 2. Watch parent dirs so we can re-seed any deleted manifest fast.
//    fs.watch is fine here — we re-check existence after each event.
function arm(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  try {
    watch(dir, (_eventType, filename) => {
      if (!filename) return;
      const rel = dir === SERVER_DIR ? `server/${filename}` : filename;
      if (STUBS[rel] && !existsSync(join(DEV_DIR, rel))) {
        ensureStub(rel);
      }
    });
  } catch {
    // Best-effort. If the watcher fails (e.g. dir got removed), silent.
  }
}
arm(DEV_DIR);
arm(SERVER_DIR);

// 3. Spawn Next with stdio inherited so logs/colors stream through.
const child = spawn(
  process.execPath,
  [
    join(ROOT, "node_modules", "next", "dist", "bin", "next"),
    "dev",
    mode,
  ],
  { stdio: "inherit", env: process.env, cwd: ROOT },
);

function shutdown(code) {
  if (!child.killed) child.kill("SIGTERM");
  process.exit(code ?? 0);
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
child.on("exit", (code) => process.exit(code ?? 0));
