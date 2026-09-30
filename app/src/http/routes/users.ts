import { Hono } from "hono";
import { publicProfile } from "../../repo/users.js";
import type { AppEnv } from "../../types.js";
import { USERNAME } from "../../validation.js";

/** Public profiles. No email, no WhatsApp, no internal id. */
export const users = new Hono<AppEnv>();

users.get("/:username", async (c) => {
  const username = c.req.param("username").toLowerCase();
  if (!USERNAME.test(username)) return c.json({ error: "not_found" }, 404);
  const profile = await publicProfile(username);
  return profile ? c.json(profile) : c.json({ error: "not_found" }, 404);
});
