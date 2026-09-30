import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import { clientIp } from "./http/client-ip.js";
import type { AppEnv } from "./types.js";

/**
 * Live updates over Server-Sent Events.
 *
 * A live message never carries data, only a topic:
 *   - "requests": the board or a request changed (sent to everyone);
 *   - "support":  a help-chat thread changed (sent only to that member and
 *                 to admins);
 *   - "site":     a broadcast or maintenance mode changed (sent to everyone).
 * Each page then fetches what it is allowed to see through the normal API,
 * so nothing private can leak through this channel.
 *
 * Limits: a signed-in member may hold 6 streams (tabs); visitors are counted
 * per IP with a larger allowance, because a whole campus can share one IP.
 * Each stream closes after 30 minutes (the browser reconnects on its own),
 * and a ping every 25 seconds keeps proxies from closing idle streams.
 */
type Topic = "requests" | "support" | "site";
type Listener = { userId: string | null; isAdmin: boolean; notify: (t: Topic) => void };

const listeners = new Set<Listener>();
const perKey = new Map<string, number>();
const MAX_TOTAL = 3000;
const MAX_PER_MEMBER = 6;
const MAX_PER_VISITOR_IP = 150;
const LIFETIME_MS = 30 * 60_000;

let pending: NodeJS.Timeout | null = null;

/** Tell every open page that requests changed (coalesced to 1 per 300 ms). */
export function announceChange() {
  if (pending) return;
  pending = setTimeout(() => {
    pending = null;
    for (const l of listeners) l.notify("requests");
  }, 300);
}

/** Tell everyone that broadcasts or maintenance changed. */
export function announceSite() {
  for (const l of listeners) l.notify("site");
}

/** Tell one member (and the admins) that their help thread changed. */
export function announceSupport(userId: string) {
  for (const l of listeners) if (l.isAdmin || l.userId === userId) l.notify("support");
}

export function liveHandler(c: Context<AppEnv>) {
  const user = c.get("user");
  const ip = clientIp(c);
  const key = user ? `u:${user.id}` : `ip:${ip}`;
  const cap = user ? MAX_PER_MEMBER : MAX_PER_VISITOR_IP;
  const count = perKey.get(key) ?? 0;
  if (listeners.size >= MAX_TOTAL || (ip !== "local" && count >= cap)) {
    return c.json({ error: "too_many_connections" }, 429);
  }
  perKey.set(key, count + 1);
  c.header("X-Accel-Buffering", "no");

  return streamSSE(c, async (stream) => {
    let wake: (() => void) | null = null;
    const changed = new Set<Topic>();
    const listener: Listener = {
      userId: user?.id ?? null,
      isAdmin: user?.isAdmin ?? false,
      notify: (t) => {
        changed.add(t);
        wake?.();
      },
    };
    listeners.add(listener);
    const started = Date.now();
    try {
      await stream.writeSSE({ event: "ready", data: "" });
      while (!stream.aborted && Date.now() - started < LIFETIME_MS) {
        await new Promise<void>((resolve) => {
          wake = resolve;
          setTimeout(resolve, 25_000);
        });
        wake = null;
        if (stream.aborted) break;
        if (changed.size) {
          for (const t of changed) await stream.writeSSE({ event: "change", data: t });
          changed.clear();
        } else {
          await stream.writeSSE({ event: "ping", data: "" });
        }
      }
    } finally {
      listeners.delete(listener);
      const left = (perKey.get(key) ?? 1) - 1;
      if (left <= 0) perKey.delete(key);
      else perKey.set(key, left);
    }
  });
}
