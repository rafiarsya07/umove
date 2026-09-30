import type { MiddlewareHandler } from "hono";
import { clientIp } from "./client-ip.js";

/**
 * A fixed-window rate limiter kept in memory (one process, one mini PC,
 * so no shared store is needed). Each named limiter counts requests per IP
 * per minute and answers 429 with Retry-After once the limit is reached.
 *
 * Memory is bounded: expired windows are swept every minute and the table
 * is capped, so a flood of random IPs cannot grow it without limit.
 */
const WINDOW_MS = 60_000;
const MAX_KEYS = 50_000;

type Bucket = { count: number; resetAt: number };

export function rateLimit(name: string, limitPerMinute: number): MiddlewareHandler {
  const buckets = new Map<string, Bucket>();

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, b] of buckets) if (b.resetAt <= now) buckets.delete(key);
  }, WINDOW_MS);
  sweep.unref();

  return async (c, next) => {
    const ip = clientIp(c);
    if (ip === "local") return next();

    const now = Date.now();
    let b = buckets.get(ip);
    if (!b || b.resetAt <= now) {
      if (buckets.size >= MAX_KEYS) buckets.clear();
      b = { count: 0, resetAt: now + WINDOW_MS };
      buckets.set(ip, b);
    }
    b.count += 1;

    const remaining = Math.max(0, limitPerMinute - b.count);
    c.header("RateLimit-Policy", `${limitPerMinute};w=60;name="${name}"`);
    c.header(
      "RateLimit",
      `limit=${limitPerMinute}, remaining=${remaining}, reset=${Math.ceil((b.resetAt - now) / 1000)}`,
    );

    if (b.count > limitPerMinute) {
      c.header("Retry-After", String(Math.ceil((b.resetAt - now) / 1000)));
      return c.json({ error: "rate_limited" }, 429);
    }
    return next();
  };
}
