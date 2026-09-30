import { timingSafeEqual } from "node:crypto";
import type { Context } from "hono";
import { config } from "../config.js";

/**
 * Where a request came from.
 *
 * The API is reachable only through Cloudflare Tunnel (its port is bound to
 * 127.0.0.1 on the mini PC). Visitors reach it through the UMOVE Worker at
 * umove.rafiarsya.com, which adds the shared PROXY_SECRET and the visitor's
 * real IP. Those headers are trusted ONLY when the secret matches.
 */
const IP = /^[0-9a-fA-F:.]{2,45}$/;

export function viaWorker(c: Context): boolean {
  const secret = config.proxySecret;
  const given = c.req.header("x-umove-proxy");
  if (!secret || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** True for requests made on the mini PC itself (health checks). */
export function isLocal(c: Context): boolean {
  return !c.req.header("cf-connecting-ip") && !c.req.header("x-umove-proxy");
}

export function clientIp(c: Context): string {
  if (viaWorker(c)) {
    const ip = c.req.header("x-umove-client-ip")?.trim();
    if (ip && IP.test(ip)) return ip;
  }
  const cf = c.req.header("cf-connecting-ip")?.trim();
  if (cf && IP.test(cf)) return cf;
  return "local";
}
