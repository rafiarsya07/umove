import { site } from "./site";

/** An error answer from the UMove API, e.g. { error: "username_taken" }. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public fields: string[] = [],
    /** For "try again later" errors: when. */
    public until?: string,
  ) {
    super(code);
  }
}

/**
 * Calls the UMove API on the same origin. The session cookie is HttpOnly,
 * so JavaScript never sees it; the browser attaches it automatically.
 */
export async function api<T>(
  path: string,
  init: { method?: string; body?: unknown; form?: FormData } = {},
): Promise<T> {
  // Reads are safe to repeat: a blip (phone switching networks, the server
  // restarting during an update) is retried quietly before anyone sees an
  // error. Writes are never repeated, so nothing is ever posted twice.
  const method = init.method ?? "GET";
  if (method !== "GET") return once<T>(path, init);
  for (const wait of [400, 1500]) {
    try {
      return await once<T>(path, init);
    } catch (err) {
      const transient =
        err instanceof ApiError &&
        (err.code === "network" ||
          ((err.status === 502 || err.status === 503 || err.status === 504) && err.code !== "maintenance"));
      if (!transient) throw err;
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  return once<T>(path, init);
}

async function once<T>(path: string, init: { method?: string; body?: unknown; form?: FormData }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${site.apiBase}${path}`, {
      method: init.method ?? "GET",
      credentials: "same-origin",
      // A FormData body sets its own multipart content type.
      headers: init.body !== undefined ? { "content-type": "application/json" } : undefined,
      body: init.form ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
    });
  } catch {
    throw new ApiError(0, "network");
  }
  // Anything that is not JSON (an error page, a misrouted request) is an error,
  // never data: the app must not treat an HTML page as a user or a list.
  if (!(res.headers.get("content-type") ?? "").includes("application/json")) {
    throw new ApiError(res.ok ? 502 : res.status, "bad_response");
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string; fields?: string[]; until?: string };
  if (!res.ok) {
    // The site just went into maintenance: let the status provider show the maintenance screen.
    if (res.status === 503 && data.error === "maintenance") window.dispatchEvent(new Event("umove:maintenance"));
    throw new ApiError(res.status, data.error ?? "error", data.fields ?? [], data.until);
  }
  return data as T;
}
