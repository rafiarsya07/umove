/**
 * UMOVE web Worker.
 *
 * Static files never reach this code (see run_worker_first in wrangler.jsonc);
 * it only runs for /api/*, which it forwards to the API on the mini PC.
 *
 * The API trusts two headers only when they come with the shared
 * PROXY_SECRET: the visitor's real IP (for rate limiting) and the proof that
 * the request came through this Worker. The Worker always overwrites both,
 * so a visitor cannot forge them.
 */

const HOP_BY_HOP = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "x-umove-proxy",
  "x-umove-client-ip",
];

const send = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
const json = (status, error) => send(status, { error });

/**
 * What /api/status says when the mini PC can't be reached (or MAINTENANCE is
 * switched on here): the web app then shows its "we'll be right back" screen
 * instead of half-working pages.
 */
const offlineStatus = (reason, message) =>
  send(200, { maintenance: { on: true, reason, message: message || null, until: null }, broadcasts: [] });

export default {
  /**
   * @param {Request} request
   * @param {{ ASSETS: { fetch: (r: Request) => Promise<Response> }, API_ORIGIN?: string, PROXY_SECRET?: string, MAINTENANCE?: string, MAINTENANCE_MESSAGE?: string }} env
   */
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/api" && !url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    if (!env.API_ORIGIN || !env.PROXY_SECRET) return json(503, "api_not_configured");
    const isStatus = url.pathname === "/api/status";

    // Manual switch for when the mini PC itself is being worked on:
    // Cloudflare → Worker → Settings → Variables → MAINTENANCE = on.
    if (env.MAINTENANCE === "on") {
      if (isStatus) return offlineStatus("maintenance", env.MAINTENANCE_MESSAGE);
      return send(503, { error: "maintenance", message: env.MAINTENANCE_MESSAGE || null, until: null });
    }

    const target = new URL(url.pathname + url.search, env.API_ORIGIN);
    const headers = new Headers(request.headers);
    for (const h of HOP_BY_HOP) headers.delete(h);
    headers.set("x-umove-proxy", env.PROXY_SECRET);
    headers.set("x-umove-client-ip", request.headers.get("cf-connecting-ip") ?? "");

    let res;
    try {
      res = await fetch(target, {
        method: request.method,
        headers,
        body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
        // Redirects (e.g. to Google sign-in) go back to the browser untouched.
        redirect: "manual",
      });
    } catch {
      return isStatus ? offlineStatus("offline") : json(502, "api_unreachable");
    }
    // Cloudflare's own error pages (e.g. 530 / 1033 when the tunnel is down) are HTML;
    // turn them into JSON the app understands.
    const html = !(res.headers.get("content-type") ?? "").includes("application/json");
    if (res.status >= 500 && html) return isStatus ? offlineStatus("offline") : json(502, "api_unreachable");
    return res;
  },
};
