import type { Context } from "hono";

/**
 * The visitor's IP address.
 *
 * UMove is reachable from the internet ONLY through Cloudflare Tunnel: the
 * app's port is bound to 127.0.0.1 on the mini PC and nothing else is
 * forwarded. So the `CF-Connecting-IP` header, which Cloudflare sets and
 * overwrites on every request, is trustworthy. A request without it came
 * from the mini PC itself (health checks, local testing).
 */
export function clientIp(c: Context): string {
  const ip = c.req.header("cf-connecting-ip")?.trim();
  if (ip && ip.length <= 45 && /^[0-9a-fA-F:.]+$/.test(ip)) return ip;
  return "local";
}
