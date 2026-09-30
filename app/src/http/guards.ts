import type { MiddlewareHandler } from "hono";
import { config } from "../config.js";
import type { AppEnv } from "../types.js";

/** 401 unless signed in. */
export const requireUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!c.get("user")) return c.json({ error: "unauthorized" }, 401);
  await next();
};

/** 403 unless the signed-in email is listed in ADMIN_EMAILS. */
export const requireAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "unauthorized" }, 401);
  if (!user.isAdmin) return c.json({ error: "forbidden" }, 403);
  await next();
};

/**
 * Cross-site request forgery guard for every state-changing /api request:
 * the browser must say it comes from UMove itself. Browsers always send
 * Origin on POST/PATCH/DELETE and cannot be made to lie about it.
 */
export const sameOrigin: MiddlewareHandler = async (c, next) => {
  const m = c.req.method;
  if (m === "GET" || m === "HEAD") return next();
  const origin = c.req.header("origin");
  const site = c.req.header("sec-fetch-site");
  const ok = origin ? origin === config.publicOrigin : site === "same-origin";
  if (!ok) return c.json({ error: "forbidden_origin" }, 403);
  return next();
};
