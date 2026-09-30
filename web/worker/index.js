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

const json = (status, error) =>
  new Response(JSON.stringify({ error }), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export default {
  /**
   * @param {Request} request
   * @param {{ ASSETS: { fetch: (r: Request) => Promise<Response> }, API_ORIGIN?: string, PROXY_SECRET?: string }} env
   */
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/api" && !url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    if (!env.API_ORIGIN || !env.PROXY_SECRET) return json(503, "api_not_configured");

    const target = new URL(url.pathname + url.search, env.API_ORIGIN);
    const headers = new Headers(request.headers);
    for (const h of HOP_BY_HOP) headers.delete(h);
    headers.set("x-umove-proxy", env.PROXY_SECRET);
    headers.set("x-umove-client-ip", request.headers.get("cf-connecting-ip") ?? "");

    try {
      return await fetch(target, {
        method: request.method,
        headers,
        body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
        // Redirects (e.g. to Google sign-in) go back to the browser untouched.
        redirect: "manual",
      });
    } catch {
      return json(502, "api_unreachable");
    }
  },
};
