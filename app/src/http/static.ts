import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { config } from "../config.js";
import type { AppEnv } from "../types.js";

/**
 * Serves the built web app from WEB_DIST.
 *  - /assets/* have content hashes in their names: cached for a year.
 *  - everything else (index.html, icon, manifest) is revalidated each time,
 *    so a new deploy shows up immediately.
 *  - any other GET that is not /api falls back to index.html so the
 *    browser router can handle /settings, /u/aiman and so on.
 */
export function mountWeb(app: Hono<AppEnv>) {
  const root = resolve(config.webDist);
  let indexHtml: string | null = null;

  app.use(
    "/assets/*",
    serveStatic({
      root,
      onFound: (_path, c) => {
        c.header("Cache-Control", "public, max-age=31536000, immutable");
      },
    }),
  );

  app.use(
    "*",
    serveStatic({
      root,
      onFound: (_path, c) => {
        c.header("Cache-Control", "no-cache");
      },
    }),
  );

  app.get("*", async (c) => {
    if (c.req.path.startsWith("/api/")) return c.json({ error: "not_found" }, 404);
    // A request for a missing file with an extension is a real 404.
    if (/\.[a-z0-9]{2,5}$/i.test(c.req.path)) return c.text("Not found", 404);
    indexHtml ??= await readFile(join(root, "index.html"), "utf8").catch(() => null);
    if (!indexHtml) return c.text(`UMOVE API. The app lives at ${config.publicOrigin}`, 404);
    c.header("Cache-Control", "no-cache");
    return c.html(indexHtml);
  });
}
