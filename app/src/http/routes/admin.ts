import { Hono } from "hono";
import { z } from "zod";
import { decideApplication, pendingApplications } from "../../repo/users.js";
import type { AppEnv } from "../../types.js";
import { decisionSchema, roleParam } from "../../validation.js";
import { requireAdmin } from "../guards.js";

/** Admin area. Admins come from ADMIN_EMAILS only; every decision is audited. */
export const admin = new Hono<AppEnv>();
admin.use("*", requireAdmin);

admin.get("/applications", async (c) => c.json(await pendingApplications()));

admin.post("/applications/:userId/:role", async (c) => {
  const userId = z.uuid().safeParse(c.req.param("userId"));
  const role = roleParam.safeParse(c.req.param("role"));
  const body = decisionSchema.safeParse(await c.req.json().catch(() => null));
  if (!userId.success || !role.success || !body.success) return c.json({ error: "invalid" }, 400);
  const ok = await decideApplication(c.get("user")!.id, userId.data, role.data, body.data.decision);
  return ok ? c.json({ ok: true }) : c.json({ error: "not_pending" }, 409);
});
