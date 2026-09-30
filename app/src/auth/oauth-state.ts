import { randomBytes } from "node:crypto";

/**
 * Pending Google sign-ins, kept in memory for 10 minutes.
 *
 * The browser only holds a random id (in an HttpOnly cookie); the state,
 * nonce and PKCE verifier never leave the server. Each entry is used once.
 */
type Pending = { state: string; nonce: string; verifier: string; next: string; expires: number };

const TTL_MS = 10 * 60_000;
const MAX = 10_000;
const pending = new Map<string, Pending>();

const sweep = setInterval(() => {
  const now = Date.now();
  for (const [id, p] of pending) if (p.expires <= now) pending.delete(id);
}, 60_000);
sweep.unref();

export const random = (bytes = 32) => randomBytes(bytes).toString("base64url");

export function startSignIn(next: string): { id: string; entry: Pending } {
  if (pending.size >= MAX) pending.clear();
  const id = random();
  const entry = { state: random(), nonce: random(), verifier: random(48), next, expires: Date.now() + TTL_MS };
  pending.set(id, entry);
  return { id, entry };
}

/** Returns and removes the pending sign-in, if it exists and is fresh. */
export function takeSignIn(id: string | undefined): Pending | null {
  if (!id) return null;
  const entry = pending.get(id);
  pending.delete(id);
  if (!entry || entry.expires <= Date.now()) return null;
  return entry;
}
