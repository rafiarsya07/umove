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
  if (!res.ok) throw new ApiError(res.status, data.error ?? "error", data.fields ?? [], data.until);
  return data as T;
}
