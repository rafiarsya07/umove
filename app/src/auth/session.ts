import { createHash, randomBytes } from "node:crypto";
import type { Context, MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { config } from "../config.js";
import { sql } from "../db.js";
import { log } from "../log.js";
import type { AppEnv, SessionUser } from "../types.js";

/**
 * Sessions.
 *
 * The browser holds 32 random bytes in a `__Host-` cookie that is HttpOnly
 * (no JavaScript access), Secure, SameSite=Lax, and scoped to this exact
 * host. The database stores only the SHA-256 of that token, so a leaked
 * database cannot be turned into working sessions.
 */
export const SESSION_COOKIE = "umove_sid";
export const OAUTH_COOKIE = "umove_oauth";

const hash = (token: string) => createHash("sha256").update(token).digest();

export async function createSession(c: Context, userId: string) {
  const token = randomBytes(32).toString("base64url");
  const days = config.sessionDays;
  await sql`
    insert into sessions (token_hash, user_id, expires_at)
    values (${hash(token)}, ${userId}, now() + make_interval(days => ${days}))
  `;
  setCookie(c, SESSION_COOKIE, token, {
    prefix: "host",
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: days * 86400,
  });
}

export async function destroySession(c: Context) {
  const token = getCookie(c, SESSION_COOKIE, "host");
  if (token) await sql`delete from sessions where token_hash = ${hash(token)}`;
  deleteCookie(c, SESSION_COOKIE, { prefix: "host", path: "/", secure: true });
}

/** Loads the signed-in user (or null) for every request. */
export const loadSession: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set("user", null);
  const token = getCookie(c, SESSION_COOKIE, "host");
  if (token && token.length === 43) {
    const rows = await sql<{ id: string; email: string; username: string; name: string; stale: boolean }[]>`
      select u.id, u.email::text as email, u.username::text as username, u.name,
             s.last_seen < now() - interval '1 hour' as stale
      from sessions s
      join users u on u.id = s.user_id
      where s.token_hash = ${hash(token)}
        and s.expires_at > now()
        and u.status = 'active'
    `;
    const row = rows[0];
    if (row) {
      const user: SessionUser = {
        id: row.id,
        email: row.email,
        username: row.username,
        name: row.name,
        isAdmin: config.adminEmails.has(row.email.toLowerCase()),
      };
      c.set("user", user);
      if (row.stale) await sql`update sessions set last_seen = now() where token_hash = ${hash(token)}`;
    }
  }
  await next();
};

/** Removes expired sessions every hour. */
export function startSessionCleanup() {
  const run = () =>
    sql`delete from sessions where expires_at < now()`.catch((err: unknown) =>
      log.warn("session cleanup failed", { err }),
    );
  const timer = setInterval(run, 3_600_000);
  timer.unref();
  void run();
}
