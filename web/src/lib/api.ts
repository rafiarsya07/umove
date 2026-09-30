import { site } from "./site";

/** An error answer from the UMove API, e.g. { error: "username_taken" }. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public fields: string[] = [],
  ) {
    super(code);
  }
}

/**
 * Calls the UMove API on the same origin. The session cookie is HttpOnly,
 * so JavaScript never sees it; the browser attaches it automatically.
 */
export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${site.apiBase}${path}`, {
      method: init.method ?? "GET",
      credentials: "same-origin",
      headers: init.body !== undefined ? { "content-type": "application/json" } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "network");
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string; fields?: string[] };
  if (!res.ok) throw new ApiError(res.status, data.error ?? "error", data.fields ?? []);
  return data as T;
}
