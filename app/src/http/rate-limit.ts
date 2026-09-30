import { createHash } from "node:crypto";
import type { MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import { SESSION_COOKIE } from "../auth/session.js";
import { clientIp } from "./client-ip.js";

/**
 * A fixed-window rate limiter kept in memory (one process, one mini PC,
 * so no shared store is needed). Each named limiter counts requests per IP
 * per minute and answers 429 with Retry-After once the limit is reached.
 *
 * Memory is bounded: expired windows are swept every minute and the table
 * is capped, so a flood of random IPs cannot grow it without limit.
 *
 * Campus Wi-Fi puts hundreds of students behind one public IP, so a plain
 * per-IP limit would lock out a whole faculty at once. Instead:
 *   - a signed-in visitor is counted per session (the limit a person gets);
 *   - anonymous traffic is counted per IP with IP_FACTOR times that budget;
 *   - every IP also has that same IP_FACTOR ceiling, so inventing random
 *     session cookies cannot be used to dodge the limit.
 */
export const IP_FACTOR = 20;

function sessionKey(c: Parameters<MiddlewareHandler>[0]): string | null {
  const token = getCookie(c, SESSION_COOKIE, "host");
  if (!token) return null;
  return "s:" + createHash("sha256").update(token).digest("base64url").slice(0, 22);
}
const WINDOW_MS = 60_000;
const MAX_KEYS = 50_000;

type Bucket = { count: number; resetAt: number };

/** Per person (session) with an IP ceiling; see the note above. */
export function rateLimit(name: string, perPerson: number): MiddlewareHandler {
  const ipLimit = counter(`${name}-ip`, perPerson * IP_FACTOR, () => null);
  const personLimit = counter(name, perPerson, sessionKey);
  return async (c, next) => {
    const blocked = ipLimit(c) ?? personLimit(c);
    return blocked ?? next();
  };
}

type Check = (c: Parameters<MiddlewareHandler>[0]) => Response | null;

/** One fixed-window counter. keyOf returns null to use the IP (or to skip, for sessions). */
function counter(
  name: string,
  limitPerMinute: number,
  keyOf: (c: Parameters<MiddlewareHandler>[0]) => string | null,
): Check {
  const byIp = name.endsWith("-ip");
  const buckets = new Map<string, Bucket>();

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, b] of buckets) if (b.resetAt <= now) buckets.delete(key);
  }, WINDOW_MS);
  sweep.unref();

  return (c) => {
    const ip = clientIp(c);
    if (ip === "local") return null;
    const key = byIp ? ip : keyOf(c);
    if (!key) return null;

    const now = Date.now();
    let b = buckets.get(key);
    if (!b || b.resetAt <= now) {
      if (buckets.size >= MAX_KEYS) buckets.clear();
      b = { count: 0, resetAt: now + WINDOW_MS };
      buckets.set(key, b);
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
    return null;
  };
}
