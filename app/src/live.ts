import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import { clientIp } from "./http/client-ip.js";

/**
 * Live updates over Server-Sent Events.
 *
 * A live message never carries data: it only says "requests changed", and
 * each page fetches what it is allowed to see through the normal API. So
 * nothing private can leak through this channel.
 *
 * Connections are capped in total and per IP, each one closes after 30
 * minutes (the browser reconnects on its own), and a ping every 25 seconds
 * keeps proxies from closing idle streams.
 */
type Listener = () => void;
const listeners = new Set<Listener>();
const perIp = new Map<string, number>();
const MAX_TOTAL = 2000;
const MAX_PER_IP = 6;
const LIFETIME_MS = 30 * 60_000;

let pending: NodeJS.Timeout | null = null;

/** Tell every open page that requests changed (coalesced to 1 per 300 ms). */
export function announceChange() {
  if (pending) return;
  pending = setTimeout(() => {
    pending = null;
    for (const l of listeners) l();
  }, 300);
}

export function liveHandler(c: Context) {
  const ip = clientIp(c);
  const count = perIp.get(ip) ?? 0;
  if (listeners.size >= MAX_TOTAL || (ip !== "local" && count >= MAX_PER_IP)) {
    return c.json({ error: "too_many_connections" }, 429);
  }
  perIp.set(ip, count + 1);
  c.header("X-Accel-Buffering", "no");

  return streamSSE(c, async (stream) => {
    let wake: (() => void) | null = null;
    let changed = false;
    const listener = () => {
      changed = true;
      wake?.();
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
        if (changed) {
          changed = false;
          await stream.writeSSE({ event: "change", data: "requests" });
        } else {
          await stream.writeSSE({ event: "ping", data: "" });
        }
      }
    } finally {
      listeners.delete(listener);
      const left = (perIp.get(ip) ?? 1) - 1;
      if (left <= 0) perIp.delete(ip);
      else perIp.set(ip, left);
    }
  });
}
