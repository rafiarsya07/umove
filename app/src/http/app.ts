import { activePlaces } from "../repo/places.js";
import { type Context, Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import { requestId } from "hono/request-id";
import { timeout } from "hono/timeout";
import { loadSession } from "../auth/session.js";
import { config } from "../config.js";
import { dbHealthy } from "../db.js";
import { log } from "../log.js";
import type { AppEnv } from "../types.js";
import { clientIp, isLocal, viaWorker } from "./client-ip.js";
import { sameOrigin } from "./guards.js";
import { rateLimit } from "./rate-limit.js";
import { admin } from "./routes/admin.js";
import { auth } from "./routes/auth.js";
import { me } from "./routes/me.js";
import { requests } from "./routes/requests.js";
import { users } from "./routes/users.js";
import { liveHandler } from "../live.js";
import { liveBroadcasts, maintenance } from "../repo/site.js";
import { SANDBOX_HEADER, securityHeaders } from "./security.js";
import { mountWeb } from "./static.js";

/**
 * The whole HTTP surface of UMove: the web app and /api on ONE origin.
 * Same origin means no CORS to configure and cookies that never leave
 * umove.rafiarsya.com.
 */
export function createApp() {
  const app = new Hono<AppEnv>();

  app.use("*", requestId());
  // Registered before the security headers so it runs after them: a response
  // marked as a private file (document photos) gets a CSP that forbids everything.
  app.use("*", async (c, next) => {
    await next();
    if (c.res.headers.get(SANDBOX_HEADER)) {
      c.res.headers.delete(SANDBOX_HEADER);
      c.res.headers.set("Content-Security-Policy", "default-src 'none'; sandbox");
    }
  });
  app.use("*", securityHeaders);
  app.use("*", rateLimit("site", config.rateLimit.site));
  app.use("*", async (c, next) => {
    if (!["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"].includes(c.req.method)) {
      return c.text("Method not allowed", 405);
    }
    return next();
  });

  const api = new Hono<AppEnv>();
  // When a PROXY_SECRET is set, the API answers only requests forwarded by the
  // UMOVE Worker (plus health checks from the mini PC itself). Calling the
  // tunnel hostname directly gets nothing.
  api.use("*", async (c, next) => {
    if (config.proxySecret && !viaWorker(c) && !isLocal(c)) return c.json({ error: "forbidden" }, 403);
    return next();
  });
  // Small JSON bodies everywhere, except role applications (document photos).
  const tooLarge = { onError: (c: Context) => c.json({ error: "payload_too_large" }, 413) };
  const smallBody = bodyLimit({ maxSize: 32 * 1024, ...tooLarge });
  const uploadBody = bodyLimit({ maxSize: 13 * 1024 * 1024, ...tooLarge });
  // Uploads with photos: role applications and a runner's face photo.
  const isApplication = (c: { req: { method: string; path: string } }) =>
    c.req.method === "POST" && /^\/api\/me\/(roles\/[a-z]+|photo)$/.test(c.req.path);
  api.use("*", async (c, next) => (isApplication(c) ? uploadBody(c, next) : smallBody(c, next)));
  // Every API call has a deadline (longer for uploads), except the long-lived live stream.
  const deadline = timeout(15_000);
  const uploadDeadline = timeout(90_000);
  api.use("*", async (c, next) => {
    if (c.req.path.endsWith("/api/live")) return next();
    return isApplication(c) ? uploadDeadline(c, next) : deadline(c, next);
  });
  api.use("*", rateLimit("api", config.rateLimit.api));
  api.use("*", sameOrigin);
  api.use("/auth/*", rateLimit("auth", 20));
  // Writes get their own, tighter budget.
  const writes = rateLimit("writes", 30);
  api.use("*", async (c, next) => (c.req.method === "GET" || c.req.method === "HEAD" ? next() : writes(c, next)));
  api.use("*", loadSession);
  // Maintenance: admins keep full access; everyone else gets a friendly 503,
  // except for what the site needs to show the maintenance screen and let an admin sign in.
  api.use("*", async (c, next) => {
    const m = await maintenance();
    if (!m.on || c.get("user")?.isAdmin) return next();
    const p = c.req.path.slice(4); // strip "/api"
    const open =
      p === "/health" || p === "/status" || p === "/live" || p.startsWith("/auth/") || (p === "/me" && c.req.method === "GET");
    if (open) return next();
    return c.json({ error: "maintenance", message: m.message, until: m.until }, 503);
  });
  api.use("*", async (c, next) => {
    await next();
    c.header("Cache-Control", "no-store");
  });

  /** Public: maintenance state and the broadcasts this viewer should see. */
  api.get("/places", async (c) => {
    c.header("cache-control", "public, max-age=60");
    return c.json(await activePlaces());
  });
  api.get("/status", async (c) => {
    const user = c.get("user");
    const [m, broadcasts] = await Promise.all([maintenance(), liveBroadcasts(user ? { id: user.id } : null)]);
    return c.json({ maintenance: m, broadcasts });
  });

  api.get("/health", async (c) => {
    const db = await dbHealthy();
    return c.json({ status: db ? "ok" : "degraded" }, db ? 200 : 503);
  });
  api.route("/auth", auth);
  api.route("/me", me);
  api.route("/users", users);
  api.route("/admin", admin);
  api.route("/requests", requests);
  api.get("/live", (c) => liveHandler(c));

  api.notFound((c) => c.json({ error: "not_found" }, 404));
  app.route("/api", api);

  mountWeb(app);

  app.onError((err, c) => {
    if (err instanceof HTTPException) return err.getResponse();
    const id = c.get("requestId");
    log.error("request failed", { id, method: c.req.method, path: c.req.path, ip: clientIp(c), err });
    return c.json({ error: "internal_error", requestId: id }, 500);
  });

  return app;
}
