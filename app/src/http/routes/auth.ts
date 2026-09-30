import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { authorizationUrl, exchangeCode } from "../../auth/google.js";
import { startSignIn, takeSignIn } from "../../auth/oauth-state.js";
import { OAUTH_COOKIE, createSession, destroySession } from "../../auth/session.js";
import { config } from "../../config.js";
import { log } from "../../log.js";
import { upsertGoogleUser } from "../../repo/users.js";
import type { AppEnv } from "../../types.js";

/** Only a same-site path is accepted as a place to return to. */
function safeNext(value: string | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  return value.slice(0, 200);
}

export const auth = new Hono<AppEnv>();

auth.get("/google", (c) => {
  if (!config.google) return c.redirect("/login?error=unavailable");
  const { id, entry } = startSignIn(safeNext(c.req.query("next")) ?? "");
  setCookie(c, OAUTH_COOKIE, id, {
    prefix: "host",
    httpOnly: true,
    secure: true,
    // Lax so the cookie comes back on Google's top-level redirect.
    sameSite: "Lax",
    path: "/",
    maxAge: 600,
  });
  return c.redirect(authorizationUrl(entry));
});

auth.get("/google/callback", async (c) => {
  const pending = takeSignIn(getCookie(c, OAUTH_COOKIE, "host"));
  deleteCookie(c, OAUTH_COOKIE, { prefix: "host", path: "/", secure: true });

  const code = c.req.query("code");
  const state = c.req.query("state");
  if (c.req.query("error") === "access_denied") return c.redirect("/login?error=cancelled");
  if (!pending || !code || !state || state !== pending.state) return c.redirect("/login?error=expired");

  try {
    const profile = await exchangeCode(code, pending.verifier, pending.nonce);
    const user = await upsertGoogleUser(profile);
    if (user.status !== "active") return c.redirect("/login?error=suspended");
    await createSession(c, user.id);
    log.info("sign in", { userId: user.id, new: user.isNew });
    // Admins land in the admin panel, members in their dashboard,
    // unless they were on their way somewhere specific.
    const isAdmin = config.adminEmails.has(profile.email);
    const home = isAdmin ? "/admin" : "/dashboard";
    return c.redirect(user.isNew && !isAdmin ? "/settings?welcome=1" : pending.next || home);
  } catch (err) {
    log.warn("sign in failed", { err });
    return c.redirect("/login?error=failed");
  }
});

auth.post("/logout", async (c) => {
  await destroySession(c);
  return c.json({ ok: true });
});
