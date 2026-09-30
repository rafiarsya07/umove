import { Hono } from "hono";
import { applyForRole, getMe, updateProfile, withdrawRole } from "../../repo/users.js";
import type { AppEnv } from "../../types.js";
import { normalisePhone, profileSchema, roleParam } from "../../validation.js";
import { requireUser } from "../guards.js";

/** The signed-in user's own account. Every query is keyed by the session. */
export const me = new Hono<AppEnv>();
me.use("*", requireUser);

me.get("/", async (c) => {
  const user = c.get("user")!;
  const data = await getMe(user.id);
  if (!data) return c.json({ error: "unauthorized" }, 401);
  return c.json({ ...data, isAdmin: user.isAdmin });
});

me.patch("/", async (c) => {
  const user = c.get("user")!;
  const parsed = profileSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "invalid", fields: [...new Set(parsed.error.issues.map((i) => String(i.path[0])))] }, 400);
  }
  const whatsapp = normalisePhone(parsed.data.whatsapp);
  if (whatsapp === "invalid") return c.json({ error: "invalid", fields: ["whatsapp"] }, 400);

  const result = await updateProfile(user.id, { ...parsed.data, whatsapp });
  if (result === "taken") return c.json({ error: "username_taken", fields: ["username"] }, 409);
  return c.json(await getMe(user.id));
});

me.post("/roles/:role", async (c) => {
  const role = roleParam.safeParse(c.req.param("role"));
  if (!role.success) return c.json({ error: "not_found" }, 404);
  const result = await applyForRole(c.get("user")!.id, role.data);
  if (result === "need_whatsapp") return c.json({ error: "need_whatsapp" }, 409);
  if (result === "exists") return c.json({ error: "already_applied" }, 409);
  return c.json({ ok: true });
});

me.delete("/roles/:role", async (c) => {
  const role = roleParam.safeParse(c.req.param("role"));
  if (!role.success) return c.json({ error: "not_found" }, 404);
  const ok = await withdrawRole(c.get("user")!.id, role.data);
  return ok ? c.json({ ok: true }) : c.json({ error: "not_pending" }, 409);
});
